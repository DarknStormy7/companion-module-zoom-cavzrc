import { Regex, SomeCompanionConfigField } from '@companion-module/base'

export interface ZoomRoomsConfig {
	host: string
	tx_port: number
	rx_port: number
	oscOutputHeader: string
	pollMeetingStatus: number
	pollParticipantCount: number
	pollGallerySeats: number
	pollGallerySettings: number
	pollChannelRouting: number
	roomListInterval: number
	stalenessTimeoutSec: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'CAVZRC host (IP)',
			width: 6,
			default: '127.0.0.1',
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'tx_port',
			label: 'Receiving Port',
			width: 6,
			default: 9090,
			min: 1,
			max: 65535,
			step: 1,
		},
		{
			type: 'number',
			id: 'rx_port',
			label: 'Transmission Port.  Set to 0 = off)',
			width: 6,
			default: 1234,
			min: 0,
			max: 65535,
			step: 1,
		},
		{
			type: 'textinput',
			id: 'oscOutputHeader',
			label: 'OSC output header (must match CAVZRC)',
			width: 6,
			default: '/roomosc',
		},
		{
			type: 'static-text',
			id: 'pollingInfo',
			label: 'Polling',
			width: 12,
			value:
				'Each query has its own interval. Participant count and gallery seats are only asked while a room is in a meeting. Mute and camera status need no polling: CAVZRC sends them when they change.',
		},
		{
			type: 'dropdown',
			id: 'pollMeetingStatus',
			label: 'Meeting status',
			width: 6,
			default: 5000,
			choices: [
				{ id: 0, label: 'Off' },
				{ id: 2500, label: 'Every 2.5 seconds' },
				{ id: 5000, label: 'Every 5 seconds' },
				{ id: 10000, label: 'Every 10 seconds' },
				{ id: 30000, label: 'Every 30 seconds' },
			],
		},
		{
			type: 'dropdown',
			id: 'pollParticipantCount',
			label: 'Participant count (in meeting only)',
			width: 6,
			default: 2500,
			choices: [
				{ id: 0, label: 'Off' },
				{ id: 1000, label: 'Every second' },
				{ id: 2500, label: 'Every 2.5 seconds' },
				{ id: 5000, label: 'Every 5 seconds' },
				{ id: 10000, label: 'Every 10 seconds' },
			],
		},
		{
			type: 'dropdown',
			id: 'pollGallerySeats',
			label: 'Gallery seats and ghost count (in meeting only)',
			width: 6,
			default: 10000,
			choices: [
				{ id: 0, label: 'Off' },
				{ id: 5000, label: 'Every 5 seconds' },
				{ id: 10000, label: 'Every 10 seconds' },
				{ id: 30000, label: 'Every 30 seconds' },
			],
		},
		{
			type: 'dropdown',
			id: 'pollGallerySettings',
			label: 'Gallery mode, grid size and exclude options',
			width: 6,
			default: 30000,
			choices: [
				{ id: 0, label: 'Off' },
				{ id: -1, label: 'On connect' },
				{ id: 30000, label: 'Every 30 seconds' },
				{ id: 60000, label: 'Every 60 seconds' },
			],
		},
		{
			type: 'dropdown',
			id: 'pollChannelRouting',
			label: 'HWIO channel routing',
			width: 6,
			default: -1,
			choices: [
				{ id: 0, label: 'Off' },
				{ id: -1, label: 'On connect' },
				{ id: 60000, label: 'Every 60 seconds' },
			],
		},
		{
			type: 'dropdown',
			id: 'roomListInterval',
			label: 'Room List Refresh (full added/paired room lists)',
			width: 6,
			default: 0,
			choices: [
				{ id: 0, label: 'On connect only (recommended)' },
				{ id: 30000, label: '30 seconds' },
				{ id: 60000, label: '60 seconds' },
				{ id: 300000, label: '5 minutes' },
			],
		},
		{
			type: 'dropdown',
			id: 'stalenessTimeoutSec',
			label: 'No-data warning: mark CAVZRC unreachable after',
			width: 6,
			default: 60,
			choices: [
				{ id: 0, label: 'Disabled' },
				{ id: 30, label: '30 seconds of silence' },
				{ id: 60, label: '60 seconds of silence' },
				{ id: 120, label: '2 minutes of silence' },
				{ id: 300, label: '5 minutes of silence' },
			],
		},
	]
}
