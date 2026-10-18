import type { CompanionActionDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import {
	ROOM_TARGET_OPTIONS,
	CHANNEL_NUM_OPTION,
	parseChannelNum,
	roomCommand,
	roomCommandWithOpts,
} from './action-room-utils.js'

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
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setDanteContentOff', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdDante.setDanteContentParticipant]: {
			name: 'Dante: Content participant',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setDanteContentParticipant', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdDante.setDanteContentMix]: {
			name: 'Dante: Content mixed audio',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setDanteContentMix', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdDante.setDanteContentScreenshare]: {
			name: 'Dante: Content screenshare',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setDanteContentScreenshare', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdDante.setDanteParticipantSelection]: {
			name: 'Dante: Select participant',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'textinput', label: 'Zoom username', id: 'zoom_username', default: '' },
			],
			callback: roomCommandWithOpts(instance, 'setDanteParticipantSelection', (o) => [
				parseChannelNum(o.channel_num),
				typeof o.zoom_username === 'string' ? o.zoom_username : '',
			]),
		},

		[ActionIdDante.getDanteChannelConfig]: {
			name: 'Dante: Get channel config',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'getDanteChannelConfig', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdDante.getDanteChannelCount]: {
			name: 'Dante: Get channel count',
			options: [...ROOM_TARGET_OPTIONS],
			callback: roomCommand(instance, 'getDanteChannelCount'),
		},
	}

	return actions
}
