import type { CompanionActionDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import { ROOM_TARGET_OPTIONS, MULTI_CHANNEL_OPTIONS, channelCommand, roomCommand } from './action-room-utils.js'

export enum ActionIdDante {
	setDanteContentOff = 'setDanteContentOff',
	setDanteContentParticipant = 'setDanteContentParticipant',
	setDanteContentMix = 'setDanteContentMix',
	setDanteContentScreenshare = 'setDanteContentScreenshare',
	setDanteParticipantSelection = 'setDanteParticipantSelection',
	getDanteChannelConfig = 'getDanteChannelConfig',
	getDanteChannelCount = 'getDanteChannelCount',
}

export function GetActionsDante(instance: ZoomRoomsInstance): {
	[id in ActionIdDante]: CompanionActionDefinition | undefined
} {
	const actions: { [id in ActionIdDante]: CompanionActionDefinition | undefined } = {
		[ActionIdDante.setDanteContentOff]: {
			name: 'Dante: Content off',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setDanteContentOff'),
		},

		[ActionIdDante.setDanteContentParticipant]: {
			name: 'Dante: Content participant',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setDanteContentParticipant'),
		},

		[ActionIdDante.setDanteContentMix]: {
			name: 'Dante: Content mixed audio',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setDanteContentMix'),
		},

		[ActionIdDante.setDanteContentScreenshare]: {
			name: 'Dante: Content screenshare',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setDanteContentScreenshare'),
		},

		[ActionIdDante.setDanteParticipantSelection]: {
			name: 'Dante: Select participant',
			options: [
				...ROOM_TARGET_OPTIONS,
				...MULTI_CHANNEL_OPTIONS,
				{ type: 'textinput', label: 'Zoom username', id: 'zoom_username', default: '' },
			],
			callback: channelCommand(instance, 'setDanteParticipantSelection', (o) => [
				typeof o.zoom_username === 'string' ? o.zoom_username : '',
			]),
		},

		[ActionIdDante.getDanteChannelConfig]: {
			name: 'Dante: Get channel config',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'getDanteChannelConfig'),
		},

		[ActionIdDante.getDanteChannelCount]: {
			name: 'Dante: Get channel count',
			options: [...ROOM_TARGET_OPTIONS],
			callback: roomCommand(instance, 'getDanteChannelCount'),
		},
	}

	return actions
}
