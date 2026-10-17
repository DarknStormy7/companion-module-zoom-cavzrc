import type { CompanionFeedbackDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import { ghostSeatCount } from '../utils.js'
import { getRoomOption } from './feedback-utils.js'

export enum FeedbackIdGallery {
	GhostSeats = 'gallery_ghost_seats',
	GalleryMode = 'gallery_mode',
}

export function GetFeedbacksGallery(instance: ZoomRoomsInstance): {
	[id in FeedbackIdGallery]: CompanionFeedbackDefinition | undefined
} {
	const roomOpt = getRoomOption(instance)

	const feedbacks: { [id in FeedbackIdGallery]: CompanionFeedbackDefinition | undefined } = {
		[FeedbackIdGallery.GhostSeats]: {
			type: 'boolean',
			name: 'Gallery has "not joined" seats',
			description:
				'True when the gallery has more named seats than participants (plus the room). Needs "Gallery seats" polling.',
			defaultStyle: { bgcolor: 0xff8000 },
			options: [roomOpt],
			callback: (feedback) => {
				const roomId = feedback.options.roomId as string
				if (!roomId) return false
				return (ghostSeatCount(instance.state.rooms[roomId]) ?? 0) > 0
			},
		},

		[FeedbackIdGallery.GalleryMode]: {
			type: 'boolean',
			name: 'Gallery distribution mode is',
			description: 'True when the room uses the selected gallery distribution mode',
			defaultStyle: { bgcolor: 0x00ff00 },
			options: [
				roomOpt,
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
			callback: (feedback) => {
				const roomId = feedback.options.roomId as string
				if (!roomId) return false
				const mode = (instance.state.rooms[roomId]?.galleryMode ?? '').toLowerCase().replace(/[\s_-]/g, '')
				return mode !== '' && mode === feedback.options.mode
			},
		},
	}

	return feedbacks
}
