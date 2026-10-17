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
	type: 'number',
	label: 'Channel',
	id: 'channel_num',
	default: 1,
	min: 1,
	max: 64,
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
