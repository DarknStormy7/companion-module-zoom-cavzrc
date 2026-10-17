import type { CompanionFeedbackDefinition, CompanionFeedbackDefinitions } from '@companion-module/base'
import type { ZoomRoomsInstance } from './utils.js'
import { FeedbackIdRoomStatus, GetFeedbacksRoomStatus } from './feedbacks/feedback-room-status.js'
import { FeedbackIdChannelStatus, GetFeedbacksChannelStatus } from './feedbacks/feedback-channels.js'
import { FeedbackIdGallery, GetFeedbacksGallery } from './feedbacks/feedback-gallery.js'

export function GetFeedbacks(instance: ZoomRoomsInstance): CompanionFeedbackDefinitions {
	const feedbacksRoomStatus: { [id in FeedbackIdRoomStatus]: CompanionFeedbackDefinition | undefined } =
		GetFeedbacksRoomStatus(instance)
	const feedbacksChannelStatus: { [id in FeedbackIdChannelStatus]: CompanionFeedbackDefinition | undefined } =
		GetFeedbacksChannelStatus(instance)
	const feedbacksGallery: { [id in FeedbackIdGallery]: CompanionFeedbackDefinition | undefined } =
		GetFeedbacksGallery(instance)

	return {
		...feedbacksRoomStatus,
		...feedbacksChannelStatus,
		...feedbacksGallery,
	}
}
