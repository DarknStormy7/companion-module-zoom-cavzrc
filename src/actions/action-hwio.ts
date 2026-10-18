import type { CompanionActionDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import {
	ROOM_TARGET_OPTIONS,
	CHANNEL_NUM_OPTION,
	parseChannelNum,
	roomCommand,
	roomCommandWithOpts,
} from './action-room-utils.js'

export enum ActionIdHWIO {
	setHWIOMode = 'setHWIOMode',
	setHWIOInputSelection = 'setHWIOInputSelection',
	setHWIOContentOff = 'setHWIOContentOff',
	setHWIOContentTestSignal = 'setHWIOContentTestSignal',
	setHWIOContentParticipant = 'setHWIOContentParticipant',
	setHWIOContentActiveSpeaker = 'setHWIOContentActiveSpeaker',
	setHWIOContentGallery = 'setHWIOContentGallery',
	setHWIOContentScreenshare = 'setHWIOContentScreenshare',
	setHWIOContentSpotlight = 'setHWIOContentSpotlight',
	setHWIOContentPinGroup = 'setHWIOContentPinGroup',
	setHWIOResolutionFrameRate = 'setHWIOResolutionFrameRate',
	setHWIOAudioMix = 'setHWIOAudioMix',
	setHWIOParticipantSelection = 'setHWIOParticipantSelection',
	setHWIOGallerySelection = 'setHWIOGallerySelection',
	setHWIOScreenshareSelection = 'setHWIOScreenshareSelection',
	setHWIOPinGroupSelection = 'setHWIOPinGroupSelection',
	getHWIOChannelConfig = 'getHWIOChannelConfig',
	getHWIOChannelCount = 'getHWIOChannelCount',
	getHWIOSupportedResolutionFrameRate = 'getHWIOSupportedResolutionFrameRate',
}

export function GetActionsHWIO(instance: ZoomRoomsInstance): {
	[id in ActionIdHWIO]: CompanionActionDefinition | undefined
} {
	const actions: { [id in ActionIdHWIO]: CompanionActionDefinition | undefined } = {
		[ActionIdHWIO.setHWIOMode]: {
			name: 'HWIO: Set mode',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'number', label: 'Mode index', id: 'mode_index', default: 0, min: 0, max: 99 },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOMode', (o) => [
				parseChannelNum(o.channel_num),
				Number(o.mode_index) || 0,
			]),
		},

		[ActionIdHWIO.setHWIOInputSelection]: {
			name: 'HWIO: Set input selection',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'number', label: 'Video index', id: 'video_index', default: 0, min: 0, max: 99 },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOInputSelection', (o) => [
				parseChannelNum(o.channel_num),
				Number(o.video_index) || 0,
			]),
		},

		[ActionIdHWIO.setHWIOContentOff]: {
			name: 'HWIO: Content off',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentOff', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOContentTestSignal]: {
			name: 'HWIO: Content test signal',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentTestSignal', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOContentParticipant]: {
			name: 'HWIO: Content participant',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentParticipant', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOContentActiveSpeaker]: {
			name: 'HWIO: Content active speaker',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentActiveSpeaker', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOContentGallery]: {
			name: 'HWIO: Content gallery',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentGallery', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOContentScreenshare]: {
			name: 'HWIO: Content screenshare',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentScreenshare', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOContentSpotlight]: {
			name: 'HWIO: Content spotlight',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentSpotlight', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOContentPinGroup]: {
			name: 'HWIO: Content pin group',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'setHWIOContentPinGroup', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.setHWIOResolutionFrameRate]: {
			name: 'HWIO: Set resolution/framerate',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'textinput', label: 'Resolution/framerate', id: 'resolution_framerate', default: '' },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOResolutionFrameRate', (o) => [
				parseChannelNum(o.channel_num),
				typeof o.resolution_framerate === 'string' ? o.resolution_framerate : '',
			]),
		},

		[ActionIdHWIO.setHWIOAudioMix]: {
			name: 'HWIO: Set audio mix',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'number', label: 'Setting index', id: 'setting_index', default: 0, min: 0, max: 99 },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOAudioMix', (o) => [
				parseChannelNum(o.channel_num),
				Number(o.setting_index) || 0,
			]),
		},

		[ActionIdHWIO.setHWIOParticipantSelection]: {
			name: 'HWIO: Select participant',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'textinput', label: 'Zoom username', id: 'zoom_username', default: '' },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOParticipantSelection', (o) => [
				parseChannelNum(o.channel_num),
				typeof o.zoom_username === 'string' ? o.zoom_username : '',
			]),
		},

		[ActionIdHWIO.setHWIOGallerySelection]: {
			name: 'HWIO: Select gallery',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'number', label: 'Gallery index', id: 'gallery_index', default: 0, min: 0, max: 99 },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOGallerySelection', (o) => [
				parseChannelNum(o.channel_num),
				Number(o.gallery_index) || 0,
			]),
		},

		[ActionIdHWIO.setHWIOScreenshareSelection]: {
			name: 'HWIO: Select screenshare',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'number', label: 'Screenshare index', id: 'screenshare_index', default: 0, min: 0, max: 99 },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOScreenshareSelection', (o) => [
				parseChannelNum(o.channel_num),
				Number(o.screenshare_index) || 0,
			]),
		},

		[ActionIdHWIO.setHWIOPinGroupSelection]: {
			name: 'HWIO: Select pin group',
			options: [
				...ROOM_TARGET_OPTIONS,
				CHANNEL_NUM_OPTION,
				{ type: 'number', label: 'Pin group index', id: 'pin_group_index', default: 0, min: 0, max: 99 },
			],
			callback: roomCommandWithOpts(instance, 'setHWIOPinGroupSelection', (o) => [
				parseChannelNum(o.channel_num),
				Number(o.pin_group_index) || 0,
			]),
		},

		[ActionIdHWIO.getHWIOChannelConfig]: {
			name: 'HWIO: Get channel config',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'getHWIOChannelConfig', (o) => [parseChannelNum(o.channel_num)]),
		},

		[ActionIdHWIO.getHWIOChannelCount]: {
			name: 'HWIO: Get channel count',
			options: [...ROOM_TARGET_OPTIONS],
			callback: roomCommand(instance, 'getHWIOChannelCount'),
		},

		[ActionIdHWIO.getHWIOSupportedResolutionFrameRate]: {
			name: 'HWIO: Get supported resolution/framerate',
			options: [...ROOM_TARGET_OPTIONS, CHANNEL_NUM_OPTION],
			callback: roomCommandWithOpts(instance, 'getHWIOSupportedResolutionFrameRate', (o) => [
				parseChannelNum(o.channel_num),
			]),
		},
	}

	return actions
}
