import type { CompanionActionDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import { ROOM_TARGET_OPTIONS, MULTI_CHANNEL_OPTIONS, channelCommand, roomCommand } from './action-room-utils.js'

export enum ActionIdNDI {
	setNDIContentOff = 'setNDIContentOff',
	setNDIContentParticipant = 'setNDIContentParticipant',
	setNDIContentActiveSpeaker = 'setNDIContentActiveSpeaker',
	setNDIContentGallery = 'setNDIContentGallery',
	setNDIContentScreenshare = 'setNDIContentScreenshare',
	setNDIContentSpotlight = 'setNDIContentSpotlight',
	setNDIContentPinGroup = 'setNDIContentPinGroup',
	setNDIParticipantSelection = 'setNDIParticipantSelection',
	setNDIGallerySelection = 'setNDIGallerySelection',
	setNDIScreenshareSelection = 'setNDIScreenshareSelection',
	setNDIPinGroupSelection = 'setNDIPinGroupSelection',
	getNDIChannelConfig = 'getNDIChannelConfig',
	getNDIChannelCount = 'getNDIChannelCount',
}

export function GetActionsNDI(instance: ZoomRoomsInstance): {
	[id in ActionIdNDI]: CompanionActionDefinition | undefined
} {
	const actions: { [id in ActionIdNDI]: CompanionActionDefinition | undefined } = {
		[ActionIdNDI.setNDIContentOff]: {
			name: 'NDI: Set content off',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setNDIContentOff'),
		},

		[ActionIdNDI.setNDIContentParticipant]: {
			name: 'NDI: Set content to participant',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setNDIContentParticipant'),
		},

		[ActionIdNDI.setNDIContentActiveSpeaker]: {
			name: 'NDI: Set content to active speaker',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setNDIContentActiveSpeaker'),
		},

		[ActionIdNDI.setNDIContentGallery]: {
			name: 'NDI: Set content to gallery',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setNDIContentGallery'),
		},

		[ActionIdNDI.setNDIContentScreenshare]: {
			name: 'NDI: Set content to screenshare',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setNDIContentScreenshare'),
		},

		[ActionIdNDI.setNDIContentSpotlight]: {
			name: 'NDI: Set content to spotlight',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setNDIContentSpotlight'),
		},

		[ActionIdNDI.setNDIContentPinGroup]: {
			name: 'NDI: Set content to pin group',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'setNDIContentPinGroup'),
		},

		[ActionIdNDI.setNDIParticipantSelection]: {
			name: 'NDI: Select participant',
			options: [
				...ROOM_TARGET_OPTIONS,
				...MULTI_CHANNEL_OPTIONS,
				{ type: 'textinput', label: 'Zoom username', id: 'exact_zoom_username', default: '' },
			],
			callback: channelCommand(instance, 'setNDIParticipantSelection', (o) => [
				typeof o.exact_zoom_username === 'string' ? o.exact_zoom_username : '',
			]),
		},

		[ActionIdNDI.setNDIGallerySelection]: {
			name: 'NDI: Select gallery',
			options: [
				...ROOM_TARGET_OPTIONS,
				...MULTI_CHANNEL_OPTIONS,
				{ type: 'number', label: 'Gallery index', id: 'gallery_index', default: 0, min: 0, max: 99 },
			],
			callback: channelCommand(instance, 'setNDIGallerySelection', (o) => [Number(o.gallery_index || 0)]),
		},

		[ActionIdNDI.setNDIScreenshareSelection]: {
			name: 'NDI: Select screenshare',
			options: [
				...ROOM_TARGET_OPTIONS,
				...MULTI_CHANNEL_OPTIONS,
				{ type: 'number', label: 'Screenshare index', id: 'screenshare_index', default: 0, min: 0, max: 99 },
			],
			callback: channelCommand(instance, 'setNDIScreenshareSelection', (o) => [Number(o.screenshare_index) || 0]),
		},

		[ActionIdNDI.setNDIPinGroupSelection]: {
			name: 'NDI: Select pin group',
			options: [
				...ROOM_TARGET_OPTIONS,
				...MULTI_CHANNEL_OPTIONS,
				{ type: 'number', label: 'Pin group index', id: 'pin_group_index', default: 0, min: 0, max: 99 },
			],
			callback: channelCommand(instance, 'setNDIPinGroupSelection', (o) => [Number(o.pin_group_index) || 0]),
		},

		[ActionIdNDI.getNDIChannelConfig]: {
			name: 'NDI: Get channel config',
			options: [...ROOM_TARGET_OPTIONS, ...MULTI_CHANNEL_OPTIONS],
			callback: channelCommand(instance, 'getNDIChannelConfig'),
		},

		[ActionIdNDI.getNDIChannelCount]: {
			name: 'NDI: Get channel count',
			options: [...ROOM_TARGET_OPTIONS],
			callback: roomCommand(instance, 'getNDIChannelCount'),
		},
	}

	return actions
}
