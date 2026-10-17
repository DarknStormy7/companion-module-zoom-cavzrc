import type { CompanionActionDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import { ROOM_TARGET_OPTIONS, buildRoomPath, getRoomTarget, resolveRoomIDs, roomCommand } from './action-room-utils.js'
import { normalizeMeetingId } from './action-gallery.js'

export enum ActionIdJoinFlow {
	joinMeeting = 'joinMeeting',
	startMeeting = 'startMeeting',
	leaveMeeting = 'leaveMeeting',
	resetJoinAttempts = 'resetJoinAttempts',
}

export function GetActionsJoinFlow(instance: ZoomRoomsInstance): {
	[id in ActionIdJoinFlow]: CompanionActionDefinition | undefined
} {
	const actions: { [id in ActionIdJoinFlow]: CompanionActionDefinition | undefined } = {
		[ActionIdJoinFlow.joinMeeting]: {
			name: 'Join meeting',
			options: [
				...ROOM_TARGET_OPTIONS,
				{ type: 'textinput', label: 'Meeting ID', id: 'meetingID', default: '', useVariables: true },
				{ type: 'textinput', label: 'Meeting password', id: 'meetingPass', default: '', useVariables: true },
				{ type: 'textinput', label: 'User name', id: 'userName', default: '' },
			],
			callback: (action) => {
				try {
					const opt = action.options
					const { targetType, roomArg } = getRoomTarget(opt)
					const targetKey = `${targetType}:${roomArg ?? 'allRooms'}`
					if (!instance.OSC?.canAttemptJoin(targetKey)) {
						instance.log(
							'warn',
							`Join meeting blocked for ${targetKey}: a join was already attempted in the last 10 seconds. Wait or use "Reset join attempt limit" to send immediately.`,
						)
						return
					}
					const { path, args } = buildRoomPath(targetType, 'joinMeeting', roomArg)
					instance.OSC.recordJoinAttempt(targetKey)
					instance.OSC.sendCommand(path, [
						...args,
						typeof opt.meetingID === 'string' ? opt.meetingID : '',
						typeof opt.meetingPass === 'string' ? opt.meetingPass : '',
						typeof opt.userName === 'string' ? opt.userName : '',
					])
					// Remember the ID so the gallery seat actions can use it for this meeting.
					const meetingId = normalizeMeetingId(opt.meetingID)
					if (meetingId) {
						for (const roomID of resolveRoomIDs(instance, targetType, roomArg)) {
							instance.state.rooms[roomID] ??= { roomID, roomName: '', roomIndex: 0 }
							instance.state.rooms[roomID].meetingId = meetingId
						}
						instance.updateVariableValues()
					}
				} catch (e) {
					instance.log('error', `Error for joinMeeting. ${e instanceof Error ? e.message : String(e)}`)
				}
			},
		},

		[ActionIdJoinFlow.startMeeting]: {
			name: 'Start meeting',
			options: [...ROOM_TARGET_OPTIONS],
			callback: roomCommand(instance, 'startMeeting'),
		},

		[ActionIdJoinFlow.leaveMeeting]: {
			name: 'Leave meeting',
			options: [...ROOM_TARGET_OPTIONS],
			callback: roomCommand(instance, 'leaveMeeting'),
		},

		[ActionIdJoinFlow.resetJoinAttempts]: {
			name: 'Reset join attempt limit',
			options: [
				{
					type: 'dropdown',
					label: 'Reset scope',
					id: 'scope',
					default: 'all',
					choices: [
						{ id: 'all', label: 'All rooms' },
						{ id: 'target', label: 'Specific room target' },
					],
				},
				...ROOM_TARGET_OPTIONS.map((opt) => ({
					...opt,
					isVisible: (o: Record<string, unknown>) =>
						o.scope === 'target' &&
						('isVisible' in opt ? (opt.isVisible as (o: Record<string, unknown>) => boolean)(o) : true),
				})),
			],
			callback: (action) => {
				const opt = action.options
				if (opt.scope === 'all') {
					instance.OSC?.resetJoinAttempts()
				} else {
					try {
						const { targetType, roomArg } = getRoomTarget(opt)
						const targetKey = `${targetType}:${roomArg ?? 'allRooms'}`
						instance.OSC?.resetJoinAttempts(targetKey)
					} catch (e) {
						instance.log('error', `Error for resetJoinAttempts. ${e instanceof Error ? e.message : String(e)}`)
					}
				}
			},
		},
	}

	return actions
}
