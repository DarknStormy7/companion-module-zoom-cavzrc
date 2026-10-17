import type { CompanionActionDefinitions, CompanionActionDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance } from './utils.js'
import { ActionIdJoinFlow, GetActionsJoinFlow } from './actions/action-join-flow.js'
import { ActionIdNDI, GetActionsNDI } from './actions/action-ndi.js'
import { ActionIdHWIO, GetActionsHWIO } from './actions/action-hwio.js'
import { ActionIdDante, GetActionsDante } from './actions/action-dante.js'
import { ActionIdDeviceSettings, GetActionsDeviceSettings } from './actions/action-device-settings.js'
import { ActionIdOverlays, GetActionsOverlays } from './actions/action-overlays.js'
import { ActionIdContentShare, GetActionsContentShare } from './actions/action-content-share.js'
import { ActionIdRoomInfo, GetActionsRoomInfo } from './actions/action-room-info.js'
import { ActionIdCameraControl, GetActionsCameraControl } from './actions/action-camera-control.js'
import { ActionIdActiveSpeaker, GetActionsActiveSpeaker } from './actions/action-active-speaker.js'
import { ActionIdCavzrcControl, GetActionsCavzrcControl } from './actions/action-cavzrc-control.js'
import { ActionIdGlobal, GetActionsGlobal } from './actions/action-global.js'
import { ActionIdCompanion, GetActionsCompanion } from './actions/action-companion.js'
import { ActionIdGallery, GetActionsGallery } from './actions/action-gallery.js'

export function GetActions(instance: ZoomRoomsInstance): CompanionActionDefinitions {
	const actionsJoinFlow: { [id in ActionIdJoinFlow]: CompanionActionDefinition | undefined } =
		GetActionsJoinFlow(instance)
	const actionsNDI: { [id in ActionIdNDI]: CompanionActionDefinition | undefined } = GetActionsNDI(instance)
	const actionsHWIO: { [id in ActionIdHWIO]: CompanionActionDefinition | undefined } = GetActionsHWIO(instance)
	const actionsDante: { [id in ActionIdDante]: CompanionActionDefinition | undefined } = GetActionsDante(instance)
	const actionsDeviceSettings: { [id in ActionIdDeviceSettings]: CompanionActionDefinition | undefined } =
		GetActionsDeviceSettings(instance)
	const actionsOverlays: { [id in ActionIdOverlays]: CompanionActionDefinition | undefined } =
		GetActionsOverlays(instance)
	const actionsContentShare: { [id in ActionIdContentShare]: CompanionActionDefinition | undefined } =
		GetActionsContentShare(instance)
	const actionsRoomInfo: { [id in ActionIdRoomInfo]: CompanionActionDefinition | undefined } =
		GetActionsRoomInfo(instance)
	const actionsCameraControl: { [id in ActionIdCameraControl]: CompanionActionDefinition | undefined } =
		GetActionsCameraControl(instance)
	const actionsActiveSpeaker: { [id in ActionIdActiveSpeaker]: CompanionActionDefinition | undefined } =
		GetActionsActiveSpeaker(instance)
	const actionsCavzrcControl: { [id in ActionIdCavzrcControl]: CompanionActionDefinition | undefined } =
		GetActionsCavzrcControl(instance)
	const actionsGlobal: { [id in ActionIdGlobal]: CompanionActionDefinition | undefined } = GetActionsGlobal(instance)
	const actionsCompanion: { [id in ActionIdCompanion]: CompanionActionDefinition | undefined } =
		GetActionsCompanion(instance)
	const actionsGallery: { [id in ActionIdGallery]: CompanionActionDefinition | undefined } = GetActionsGallery(instance)

	const actions: {
		[
			id in
				| ActionIdJoinFlow
				| ActionIdNDI
				| ActionIdHWIO
				| ActionIdDante
				| ActionIdDeviceSettings
				| ActionIdOverlays
				| ActionIdContentShare
				| ActionIdRoomInfo
				| ActionIdCameraControl
				| ActionIdActiveSpeaker
				| ActionIdCavzrcControl
				| ActionIdGlobal
				| ActionIdCompanion
				| ActionIdGallery
		]: CompanionActionDefinition | undefined
	} = {
		...actionsJoinFlow,
		...actionsNDI,
		...actionsHWIO,
		...actionsDante,
		...actionsDeviceSettings,
		...actionsOverlays,
		...actionsContentShare,
		...actionsRoomInfo,
		...actionsCameraControl,
		...actionsActiveSpeaker,
		...actionsCavzrcControl,
		...actionsGlobal,
		...actionsCompanion,
		...actionsGallery,
	}

	return actions
}
