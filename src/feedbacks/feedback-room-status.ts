import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import { isInMeetingStatus } from '../utils.js'
import { getRoomOption } from './feedback-utils.js'

export enum FeedbackIdRoomStatus {
	RoomPaired = 'room_paired',
	InMeeting = 'in_meeting',
	MuteStatus = 'mute_status',
	CameraStatus = 'camera_status',
}

export function GetFeedbacksRoomStatus(instance: ZoomRoomsInstance): {
	[id in FeedbackIdRoomStatus]: CompanionFeedbackDefinition | undefined
} {
	const roomOpt = getRoomOption(instance)

	const feedbacks: { [id in FeedbackIdRoomStatus]: CompanionFeedbackDefinition | undefined } = {
		[FeedbackIdRoomStatus.RoomPaired]: {
			type: 'boolean',
			name: 'Room is paired',
			description: 'True when the selected room is in the paired list',
			defaultStyle: { bgcolor: 0x00ff00 },
			options: [roomOpt],
			callback: (feedback) => {
				const roomId = feedback.options.roomId as string
				if (!roomId) return false
				return instance.state.pairedRooms.some((r) => r.roomID === roomId)
			},
		},

		[FeedbackIdRoomStatus.InMeeting]: {
			type: 'boolean',
			name: 'In meeting',
			description: 'True when the selected room is in a meeting',
			defaultStyle: { bgcolor: 0x00ff00 },
			options: [roomOpt],
			callback: (feedback) => {
				const roomId = feedback.options.roomId as string
				if (!roomId) return false
				const room = instance.state.rooms[roomId]
				if (!room || room.meetingStatus === undefined) return false
				// Only "In Meeting": "connecting" and other transient states are not in a meeting yet.
				return isInMeetingStatus(room.meetingStatus)
			},
		},

		[FeedbackIdRoomStatus.MuteStatus]: {
			type: 'boolean',
			name: 'Mic unmuted',
			description: 'True when the room mic is unmuted',
			defaultStyle: { bgcolor: 0x00ff00 },
			options: [roomOpt],
			callback: (feedback) => {
				const roomId = feedback.options.roomId as string
				if (!roomId) return false
				return instance.state.rooms[roomId]?.muteStatus === true
			},
		},

		[FeedbackIdRoomStatus.CameraStatus]: {
			type: 'boolean',
			name: 'Camera on',
			description: 'True when the room camera is on',
			defaultStyle: { bgcolor: 0x00ff00 },
			options: [roomOpt],
			callback: (feedback) => {
				const roomId = feedback.options.roomId as string
				if (!roomId) return false
				return instance.state.rooms[roomId]?.cameraStatus === true
			},
		},
	}

	return feedbacks
}
