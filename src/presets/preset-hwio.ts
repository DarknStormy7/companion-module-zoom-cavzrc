import { CompanionPresetExt, btn } from './preset-utils.js'
import { ActionIdHWIO } from '../actions/action-hwio.js'

export enum PresetIdHWIO {
	HwioContentOff = 'hwio_content_off',
	HwioContentParticipant = 'hwio_content_participant',
}

const defaultOpts = { targetType: 'roomIndex', roomIndex: 1, channel_num: '1' }

export function GetPresetsHWIO(): { [id in PresetIdHWIO]: CompanionPresetExt | undefined } {
	const presets: { [id in PresetIdHWIO]: CompanionPresetExt | undefined } = {
		[PresetIdHWIO.HwioContentOff]: btn('HWIO Off', 'HWIO', ActionIdHWIO.setHWIOContentOff, defaultOpts),

		[PresetIdHWIO.HwioContentParticipant]: btn(
			'HWIO Participant',
			'HWIO',
			ActionIdHWIO.setHWIOContentParticipant,
			defaultOpts,
		),
	}

	return presets
}
