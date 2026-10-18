import { CompanionPresetExt, btn } from './preset-utils.js'
import { ActionIdNDI } from '../actions/action-ndi.js'

export enum PresetIdNDI {
	NdiContentOff = 'ndi_content_off',
	NdiContentParticipant = 'ndi_content_participant',
	NdiContentGallery = 'ndi_content_gallery',
}

const defaultOpts = { targetType: 'roomIndex', roomIndex: 1, channel_num: '1' }

export function GetPresetsNDI(): { [id in PresetIdNDI]: CompanionPresetExt | undefined } {
	const presets: { [id in PresetIdNDI]: CompanionPresetExt | undefined } = {
		[PresetIdNDI.NdiContentOff]: btn('NDI Off', 'NDI', ActionIdNDI.setNDIContentOff, defaultOpts),

		[PresetIdNDI.NdiContentParticipant]: btn(
			'NDI Participant',
			'NDI',
			ActionIdNDI.setNDIContentParticipant,
			defaultOpts,
		),

		[PresetIdNDI.NdiContentGallery]: btn('NDI Gallery', 'NDI', ActionIdNDI.setNDIContentGallery, defaultOpts),
	}

	return presets
}
