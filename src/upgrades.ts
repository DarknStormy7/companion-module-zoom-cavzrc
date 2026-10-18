import type { CompanionStaticUpgradeScript } from '@companion-module/base'
import type { ZoomRoomsConfig } from './config.js'

/**
 * v0.6: the single "Poll Interval" became one interval per query. A saved
 * pollInterval carries over to meeting status and participant count, so a
 * connection that had polling off keeps it off.
 */
const splitPollInterval: CompanionStaticUpgradeScript<ZoomRoomsConfig> = (_context, props) => {
	const config: (ZoomRoomsConfig & { pollInterval?: number }) | null = props.config
	if (!config || config.pollMeetingStatus !== undefined) {
		return { updatedConfig: null, updatedActions: [], updatedFeedbacks: [] }
	}
	const old = Number(config.pollInterval ?? 0)
	config.pollMeetingStatus = old > 0 ? Math.max(old, 2500) : 0
	config.pollParticipantCount = old > 0 ? old : 0
	config.pollGallerySeats = 10000
	config.pollGallerySettings = 30000
	config.pollChannelRouting = -1
	delete config.pollInterval
	return { updatedConfig: config, updatedActions: [], updatedFeedbacks: [] }
}

/** v0.7: the Channel option became a text field so it can take a variable; saved numbers become text. */
const channelAsText: CompanionStaticUpgradeScript<ZoomRoomsConfig> = (_context, props) => {
	const updatedActions = props.actions.filter((action) => {
		if (typeof action.options.channel_num !== 'number') return false
		action.options.channel_num = String(action.options.channel_num)
		return true
	})
	return { updatedConfig: null, updatedActions, updatedFeedbacks: [] }
}

export const UpgradeScripts: CompanionStaticUpgradeScript<ZoomRoomsConfig>[] = [splitPollInterval, channelAsText]
