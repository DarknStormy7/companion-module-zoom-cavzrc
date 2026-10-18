import { CompanionPresetExt, btn } from './preset-utils.js'
import { ActionIdDante } from '../actions/action-dante.js'

export enum PresetIdDante {
	DanteContentOff = 'dante_content_off',
	DanteContentMix = 'dante_content_mix',
}

const defaultOpts = { targetType: 'roomIndex', roomIndex: 1, channel_num: '1' }

export function GetPresetsDante(): { [id in PresetIdDante]: CompanionPresetExt | undefined } {
	const presets: { [id in PresetIdDante]: CompanionPresetExt | undefined } = {
		[PresetIdDante.DanteContentOff]: btn('Dante Off', 'Dante', ActionIdDante.setDanteContentOff, defaultOpts),

		[PresetIdDante.DanteContentMix]: btn('Dante Mix', 'Dante', ActionIdDante.setDanteContentMix, defaultOpts),
	}

	return presets
}
