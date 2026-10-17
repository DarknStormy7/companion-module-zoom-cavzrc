import type { CompanionActionDefinition, SomeCompanionActionInputField } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import type { OscSendArg } from '../osc.js'
import {
	ROOM_TARGET_OPTIONS,
	CHANNEL_NUM_OPTION,
	buildRoomPath,
	getRoomTarget,
	resolveRoomIDs,
	roomCommand,
	roomCommandWithOpts,
} from './action-room-utils.js'

export enum ActionIdGallery {
	setGalleryDistributionMode = 'setGalleryDistributionMode',
	galleryClearSeats = 'galleryClearSeats',
	galleryDeleteSeat = 'galleryDeleteSeat',
	gallerySetSeat = 'gallerySetSeat',
	gallerySwapSeats = 'gallerySwapSeats',
	galleryExcludeOption = 'galleryExcludeOption',
	galleryExcludeName = 'galleryExcludeName',
	galleryClearExcludeNames = 'galleryClearExcludeNames',
	gallerySetMeetingId = 'gallerySetMeetingId',
	galleryReloadCsv = 'galleryReloadCsv',
	galleryRefresh = 'galleryRefresh',
	setHWIOGalleryGridSize = 'setHWIOGalleryGridSize',
	setHWIOAspectRatio = 'setHWIOAspectRatio',
	getHWIOLayoutSettings = 'getHWIOLayoutSettings',
	refreshAll = 'refreshAll',
}

const MEETING_ID_OPTION: SomeCompanionActionInputField = {
	type: 'textinput',
	label: 'Meeting ID (blank = the ID stored for the room by "Join meeting" or "Gallery: Set meeting ID")',
	id: 'meetingId',
	default: '',
	useVariables: true,
}

function str(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

/** Meeting IDs are typed with spaces or dashes ("891 656 1023"); CAVZRC wants the digits. */
export function normalizeMeetingId(value: unknown): string {
	return str(value).trim().replace(/[\s-]/g, '')
}

/** Tile aspect ratio that fills an output split into rows x cols. */
export function tileAspectRatio(rows: number, cols: number, width = 1920, height = 1080): number {
	return Math.round((width / cols / (height / rows)) * 1000) / 1000
}

/** "1, 3,4 5" → [1, 3, 4, 5] */
export function parseChannelList(value: unknown): number[] {
	return str(value)
		.split(/[\s,;]+/)
		.map((v) => parseInt(v, 10))
		.filter((n) => Number.isInteger(n) && n > 0)
}

/**
 * Send a meeting-scoped gallery command. A typed meeting ID goes to the
 * selected target; a blank one is filled per room from the stored ID.
 */
function meetingCommand(
	instance: ZoomRoomsInstance,
	command: string,
	getExtra: (opt: Record<string, unknown>) => OscSendArg[] = () => [],
) {
	return (action: { options: Record<string, unknown> }) => {
		try {
			const opt = action.options
			const { targetType, roomArg } = getRoomTarget(opt)
			const extra = getExtra(opt)
			const typed = normalizeMeetingId(opt.meetingId)
			if (typed) {
				const { path, args } = buildRoomPath(targetType, command, roomArg)
				instance.OSC?.sendCommand(path, [...args, typed, ...extra])
				return
			}
			let sent = 0
			for (const roomID of resolveRoomIDs(instance, targetType, roomArg)) {
				const meetingId = instance.state.rooms[roomID]?.meetingId
				if (!meetingId) continue
				instance.OSC?.sendCommand(`/zoomRooms/roomID/${command}`, [roomID, meetingId, ...extra])
				sent++
			}
			if (sent === 0) {
				instance.log(
					'warn',
					`${command}: no meeting ID known for this room. Type it in the action, or store it with "Gallery: Set meeting ID".`,
				)
			}
		} catch (e) {
			instance.log('error', `Error for ${command}.  ${e instanceof Error ? e.message : String(e)}`)
		}
	}
}

export function GetActionsGallery(instance: ZoomRoomsInstance): {
	[id in ActionIdGallery]: CompanionActionDefinition | undefined
} {
	const actions: { [id in ActionIdGallery]: CompanionActionDefinition | undefined } = {
		[ActionIdGallery.setGalleryDistributionMode]: {
			name: 'Gallery: Set distribution mode',
			options: [
				...ROOM_TARGET_OPTIONS,
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'assigned',
					choices: [
						{ id: 'waterfall', label: 'Waterfall' },
						{ id: 'roundrobin', label: 'Round robin' },
						{ id: 'assigned', label: 'Assigned' },
					],
				},
			],
			callback: roomCommandWithOpts(instance, 'setGalleryDistributionMode', (o) => [str(o.mode) || 'assigned']),
		},

		[ActionIdGallery.galleryClearSeats]: {
			name: 'Gallery: Clear all seats of the meeting (removes "not joined")',
			description:
				'removeGalleryAssignment. Everyone still in the call is seated again; people may move to another screen.',
			options: [...ROOM_TARGET_OPTIONS, MEETING_ID_OPTION],
			callback: meetingCommand(instance, 'removeGalleryAssignment'),
		},

		[ActionIdGallery.galleryDeleteSeat]: {
			name: 'Gallery: Delete seat',
			description: 'Same as the X in the Gallery Assignments window.',
			options: [
				...ROOM_TARGET_OPTIONS,
				MEETING_ID_OPTION,
				{ type: 'number', label: 'Seat', id: 'seat', default: 2, min: 1, max: 999 },
			],
			callback: meetingCommand(instance, 'removeGalleryAssignmentSeat', (o) => [Number(o.seat) || 1]),
		},

		[ActionIdGallery.gallerySetSeat]: {
			name: 'Gallery: Assign participant to seat',
			options: [
				...ROOM_TARGET_OPTIONS,
				MEETING_ID_OPTION,
				{ type: 'number', label: 'Seat', id: 'seat', default: 2, min: 1, max: 999 },
				{ type: 'textinput', label: 'Participant name', id: 'name', default: '', useVariables: true },
			],
			callback: meetingCommand(instance, 'setGalleryAssignmentSeat', (o) => [Number(o.seat) || 1, str(o.name)]),
		},

		[ActionIdGallery.gallerySwapSeats]: {
			name: 'Gallery: Swap two seats',
			options: [
				...ROOM_TARGET_OPTIONS,
				MEETING_ID_OPTION,
				{ type: 'number', label: 'Seat A', id: 'seatA', default: 2, min: 1, max: 999 },
				{ type: 'number', label: 'Seat B', id: 'seatB', default: 3, min: 1, max: 999 },
			],
			callback: meetingCommand(instance, 'swapGalleryAssignmentSeats', (o) => [
				Number(o.seatA) || 1,
				Number(o.seatB) || 1,
			]),
		},

		[ActionIdGallery.galleryExcludeOption]: {
			name: 'Gallery: Exclude self / hosts / no-video',
			options: [
				...ROOM_TARGET_OPTIONS,
				{
					type: 'dropdown',
					label: 'Exclude',
					id: 'which',
					default: 'HostCoHost',
					choices: [
						{ id: 'Self', label: 'The room itself' },
						{ id: 'HostCoHost', label: 'Hosts and co-hosts' },
						{ id: 'NonVideo', label: 'Participants without video' },
					],
				},
				{
					type: 'dropdown',
					label: 'State',
					id: 'state',
					default: 'enable',
					choices: [
						{ id: 'enable', label: 'On' },
						{ id: 'disable', label: 'Off' },
					],
				},
			],
			callback: (action) => {
				const o = action.options
				const verb = o.state === 'disable' ? 'disable' : 'enable'
				const which = ['Self', 'HostCoHost', 'NonVideo'].includes(String(o.which)) ? String(o.which) : 'HostCoHost'
				roomCommand(instance, `${verb}GalleryExclude${which}`)(action)
				roomCommand(instance, 'getGalleryExcludeOptions')(action)
			},
		},

		[ActionIdGallery.galleryExcludeName]: {
			name: 'Gallery: Exclude participant by name',
			options: [
				...ROOM_TARGET_OPTIONS,
				MEETING_ID_OPTION,
				{
					type: 'dropdown',
					label: 'Action',
					id: 'op',
					default: 'add',
					choices: [
						{ id: 'add', label: 'Add to exclude list' },
						{ id: 'remove', label: 'Remove from exclude list' },
					],
				},
				{ type: 'textinput', label: 'Participant name', id: 'name', default: '', useVariables: true },
			],
			callback: (action) => {
				const command = action.options.op === 'remove' ? 'removeGalleryExcludeName' : 'addGalleryExcludeName'
				meetingCommand(instance, command, (o) => [str(o.name)])(action)
			},
		},

		[ActionIdGallery.galleryClearExcludeNames]: {
			name: 'Gallery: Clear exclude-by-name list',
			options: [...ROOM_TARGET_OPTIONS, MEETING_ID_OPTION],
			callback: meetingCommand(instance, 'clearGalleryExcludeNames'),
		},

		[ActionIdGallery.gallerySetMeetingId]: {
			name: 'Gallery: Set meeting ID (for meetings started from the tablet)',
			description:
				'Stores the ID in room_N_meeting_id so the seat actions work with a blank meeting ID. Cleared when the meeting ends. Blank clears it now.',
			options: [
				...ROOM_TARGET_OPTIONS,
				{ type: 'textinput', label: 'Meeting ID', id: 'value', default: '', useVariables: true },
			],
			callback: (action) => {
				try {
					const { targetType, roomArg } = getRoomTarget(action.options)
					const value = normalizeMeetingId(action.options.value)
					const ids = resolveRoomIDs(instance, targetType, roomArg)
					if (ids.length === 0) instance.log('warn', 'Set meeting ID: no matching paired room')
					for (const roomID of ids) {
						instance.state.rooms[roomID] ??= { roomID, roomName: '', roomIndex: 0 }
						instance.state.rooms[roomID].meetingId = value || undefined
					}
					instance.updateVariableValues()
				} catch (e) {
					instance.log('error', `Error for setMeetingId.  ${e instanceof Error ? e.message : String(e)}`)
				}
			},
		},

		[ActionIdGallery.galleryReloadCsv]: {
			name: 'Gallery: Reload assignments from CSV',
			options: [...ROOM_TARGET_OPTIONS],
			callback: roomCommand(instance, 'reloadGalleryAssignmentCsv'),
		},

		[ActionIdGallery.galleryRefresh]: {
			name: 'Gallery: Refresh seats, mode, grid size and exclude options',
			options: [...ROOM_TARGET_OPTIONS],
			callback: (action) => {
				for (const command of [
					'getMeetingGalleryOrder',
					'getGalleryDistributionMode',
					'getHWIOGalleryGridSize',
					'getGalleryExcludeOptions',
				]) {
					roomCommand(instance, command)(action)
				}
			},
		},

		[ActionIdGallery.setHWIOGalleryGridSize]: {
			name: 'HWIO: Set gallery grid size (and tile aspect ratio)',
			description:
				'Sets the fixed gallery grid on HWIO outputs. Optionally sets each listed channel to the tile aspect ratio that fills the output, e.g. 1x2 on 1920x1080 = 0.889.',
			options: [
				...ROOM_TARGET_OPTIONS,
				{ type: 'number', label: 'Rows', id: 'rows', default: 1, min: 1, max: 10 },
				{ type: 'number', label: 'Columns', id: 'cols', default: 1, min: 1, max: 10 },
				{ type: 'checkbox', label: 'Also set the matching tile aspect ratio', id: 'setAspect', default: true },
				{
					type: 'textinput',
					label: 'Gallery output channels (e.g. 1,3,4,5)',
					id: 'channels',
					default: '',
					useVariables: true,
					isVisible: (o) => !!o.setAspect,
				},
				{
					type: 'number',
					label: 'Output width',
					id: 'width',
					default: 1920,
					min: 1,
					max: 7680,
					isVisible: (o) => !!o.setAspect,
				},
				{
					type: 'number',
					label: 'Output height',
					id: 'height',
					default: 1080,
					min: 1,
					max: 4320,
					isVisible: (o) => !!o.setAspect,
				},
			],
			callback: (action) => {
				const o = action.options
				const rows = Number(o.rows) || 1
				const cols = Number(o.cols) || 1
				roomCommandWithOpts(instance, 'setHWIOGalleryGridSize', () => [rows, cols])(action)
				if (o.setAspect) {
					const aspect = tileAspectRatio(rows, cols, Number(o.width) || 1920, Number(o.height) || 1080)
					for (const ch of parseChannelList(o.channels)) {
						roomCommandWithOpts(instance, 'setHWIOAspectRatio', () => [ch, { type: 'f', value: aspect }])(action)
					}
				}
				roomCommand(instance, 'getHWIOGalleryGridSize')(action)
			},
		},

		[ActionIdGallery.setHWIOAspectRatio]: {
			name: 'HWIO: Set tile aspect ratio',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{
					type: 'number',
					label: 'Aspect ratio (width / height)',
					id: 'aspect',
					default: 1.778,
					min: 0.1,
					max: 10,
					step: 0.001,
				},
			],
			callback: roomCommandWithOpts(instance, 'setHWIOAspectRatio', (o) => [
				Number(o.channel_num) || 1,
				{ type: 'f', value: Number(o.aspect) || 1.778 },
			]),
		},

		[ActionIdGallery.getHWIOLayoutSettings]: {
			name: 'HWIO: Get layout settings',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'getHWIOLayoutSettings', (o) => [Number(o.channel_num) || 1]),
		},

		[ActionIdGallery.refreshAll]: {
			name: 'Refresh all now',
			description: 'Asks CAVZRC for every value this module tracks, once, whatever the polling settings.',
			options: [],
			callback: () => instance.OSC?.refreshAll(),
		},
	}

	return actions
}
