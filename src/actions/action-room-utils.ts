import type { SomeCompanionActionInputField } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import type { TargetType } from '../utils.js'
import type { OscSendArg } from '../osc.js'

export const ROOM_TARGET_OPTIONS: SomeCompanionActionInputField[] = [
	{
		type: 'dropdown',
		label: 'Target type',
		id: 'targetType',
		default: 'roomIndex',
		choices: [
			{ id: 'roomID', label: 'Room ID' },
			{ id: 'roomName', label: 'Room name' },
			{ id: 'roomIndex', label: 'Room index' },
			{ id: 'allRooms', label: 'All rooms' },
		],
	},
	{
		type: 'textinput',
		label: 'Room ID',
		id: 'roomID',
		default: '',
		useVariables: true,

		isVisible: (o) => o.targetType === 'roomID',
	},
	{
		type: 'textinput',
		label: 'Room name',
		id: 'roomName',
		default: '',
		useVariables: true,

		isVisible: (o) => o.targetType === 'roomName',
	},
	{
		type: 'textinput',
		label: 'Room index (1-based)',
		id: 'roomIndex',
		default: '1',
		useVariables: true,
		isVisible: (o) => o.targetType === 'roomIndex',
	},
]

export const CHANNEL_NUM_OPTION: SomeCompanionActionInputField = {
	type: 'textinput',
	label: 'Channel (number or variable, e.g. $(cavzrc:room_1_hwio_<name>_channel))',
	id: 'channel_num',
	default: '1',
	useVariables: true,
}

/** Channel option for actions that can also go to several channels: hidden while "Several channels" is ticked. */
export const MULTI_CHANNEL_OPTIONS: SomeCompanionActionInputField[] = [
	{
		type: 'checkbox',
		label: 'Several channels',
		id: 'multiChannel',
		default: false,
	},
	{ ...CHANNEL_NUM_OPTION, isVisible: (o) => !o.multiChannel },
	{
		type: 'textinput',
		label: 'Channels (e.g. 1,3,$(cavzrc:room_1_hwio_<name>_channel))',
		id: 'channels',
		default: '1',
		useVariables: true,
		isVisible: (o) => !!o.multiChannel,
	},
	{
		type: 'number',
		label: 'Wait between channels (ms)',
		id: 'channelGapMs',
		default: 250,
		min: 0,
		max: 10000,
		isVisible: (o) => !!o.multiChannel,
	},
]

/** Channel numbers from a list; an entry that is not a channel number (an empty variable) is reported, not guessed. */
export function parseChannelEntries(value: unknown): { channels: number[]; invalid: string[] } {
	const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
	const channels: number[] = []
	const invalid: string[] = []
	const entries = text.split(/[,;]/).map((e) => e.trim())
	for (const entry of entries.length > 1 || entries[0] !== '' ? entries : []) {
		for (const part of entry === '' ? [''] : entry.split(/\s+/)) {
			const n = Number(part)
			if (part !== '' && Number.isInteger(n) && n >= 1 && n <= 999) channels.push(n)
			else invalid.push(part)
		}
	}
	return { channels, invalid }
}

/**
 * A command whose first argument is the channel. With "Several channels" ticked it is
 * sent to each listed channel in turn, "Wait between channels" apart.
 */
export function channelCommand(
	instance: ZoomRoomsInstance,
	command: string,
	getExtra: (opt: Record<string, unknown>) => OscSendArg[] = () => [],
) {
	const single = roomCommandWithOpts(instance, command, (o) => [parseChannelNum(o.channel_num), ...getExtra(o)])
	return (action: { options: Record<string, unknown> }): void => {
		const opt = action.options
		if (!opt.multiChannel) {
			single(action)
			return
		}
		const { channels, invalid } = parseChannelEntries(opt.channels)
		if (invalid.length > 0) {
			instance.log(
				'warn',
				`${command}: skipped channel entries that are not numbers: ${invalid.map((e) => `"${e}"`).join(', ')}`,
			)
		}
		if (channels.length === 0) {
			instance.log('error', `Error for ${command}.  No valid channel listed.`)
			return
		}
		const gap = Number(opt.channelGapMs)
		const gapMs =
			opt.channelGapMs === undefined || opt.channelGapMs === '' || !Number.isFinite(gap) || gap < 0 ? 250 : gap
		channels.forEach((ch, i) => {
			const send = (): void => roomCommandWithOpts(instance, command, (o) => [ch, ...getExtra(o)])(action)
			if (i === 0) send()
			else setTimeout(send, i * gapMs)
		})
	}
}

/** Channel number from the Channel option. Missing means 1; anything else that is not a channel number is refused, so an empty variable never lands on channel 1. */
export function parseChannelNum(value: unknown): number {
	if (value === undefined) return 1
	const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
	const n = Number(text)
	if (text === '' || !Number.isInteger(n) || n < 1 || n > 999) {
		throw new Error(`Invalid channel: "${text}". Must be a channel number (an unknown channel name variable is empty).`)
	}
	return n
}

export function parseRoomIndex(value: unknown): number {
	const n = Math.round(Number(value))
	if (!isFinite(n) || n < 1 || n > 999) {
		throw new Error(`Invalid room index: "${value}". Must be a number between 1 and 999.`)
	}
	return n
}

export function buildRoomPath(
	targetType: TargetType,
	command: string,
	roomArg: string | number | undefined,
): { path: string; args: (string | number)[] } {
	const base = `/zoomRooms/${targetType}/${command}`
	const args: (string | number)[] = []
	if (targetType === 'roomID' || targetType === 'roomName') {
		if (typeof roomArg === 'string') args.push(roomArg)
	} else if (targetType === 'roomIndex') {
		if (typeof roomArg === 'number') args.push(roomArg)
	}
	return { path: base, args }
}

export function getRoomTarget(opt: Record<string, unknown>): {
	targetType: TargetType
	roomArg: string | number | undefined
} {
	const targetType = (opt.targetType as TargetType) || 'roomIndex'
	const roomArg: string | number | undefined =
		targetType === 'roomID'
			? typeof opt.roomID === 'string'
				? opt.roomID
				: ''
			: targetType === 'roomName'
				? typeof opt.roomName === 'string'
					? opt.roomName
					: ''
				: targetType === 'roomIndex'
					? parseRoomIndex(opt.roomIndex)
					: undefined
	return { targetType, roomArg }
}

export function roomCommand(instance: ZoomRoomsInstance, command: string, extraArgs: (string | number)[] = []) {
	return (action: { options: Record<string, unknown> }) => {
		try {
			const opt = action.options
			const { targetType, roomArg } = getRoomTarget(opt)
			const { path, args } = buildRoomPath(targetType, command, roomArg)
			instance.OSC?.sendCommand(path, [...args, ...extraArgs])
		} catch (e) {
			instance.log('error', `Error for ${command}.  ${e instanceof Error ? e.message : String(e)}`)
		}
	}
}

export function roomCommandWithOpts(
	instance: ZoomRoomsInstance,
	command: string,
	getExtra: (opt: Record<string, unknown>) => OscSendArg[],
) {
	return (action: { options: Record<string, unknown> }) => {
		try {
			const opt = action.options
			const { targetType, roomArg } = getRoomTarget(opt)
			const { path, args } = buildRoomPath(targetType, command, roomArg)
			instance.OSC?.sendCommand(path, [...args, ...getExtra(opt)])
		} catch (e) {
			instance.log('error', `Error for ${command}.  ${e instanceof Error ? e.message : String(e)}`)
		}
	}
}

/** Paired room IDs a target refers to, for state that the module keeps per room. */
export function resolveRoomIDs(
	instance: ZoomRoomsInstance,
	targetType: TargetType,
	roomArg: string | number | undefined,
): string[] {
	const rooms = instance.state.pairedRooms
	if (targetType === 'roomID') return typeof roomArg === 'string' && roomArg ? [roomArg] : []
	if (targetType === 'roomName') return rooms.filter((r) => r.roomName === roomArg).map((r) => r.roomID)
	if (targetType === 'roomIndex') return rooms.filter((r) => r.roomIndex === roomArg).map((r) => r.roomID)
	return rooms.map((r) => r.roomID)
}
