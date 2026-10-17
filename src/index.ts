import { InstanceBase, runEntrypoint } from '@companion-module/base'
import { GetConfigFields, type ZoomRoomsConfig } from './config.js'
import { GetActions } from './actions.js'
import { GetFeedbacks } from './feedback.js'
import { GetPresetList } from './presets.js'
import { OSC } from './osc.js'
import type { ZoomRoomsInstance } from './utils.js'
import { createDefaultState } from './utils.js'
import { initVariableDefinitions } from './variables/variable-definitions.js'
import { updateVariableValues } from './variables/variable-values.js'
import { UpgradeScripts } from './upgrades.js'

class ZoomRoomsInstanceImpl extends InstanceBase<ZoomRoomsConfig> implements ZoomRoomsInstance {
	public config: ZoomRoomsConfig = {
		host: '127.0.0.1',
		tx_port: 9090,
		rx_port: 1234,
		oscOutputHeader: '/roomosc',
		pollMeetingStatus: 5000,
		pollParticipantCount: 2500,
		pollGallerySeats: 10000,
		pollGallerySettings: 30000,
		pollChannelRouting: -1,
		roomListInterval: 0,
		stalenessTimeoutSec: 60,
	}

	public state = createDefaultState()
	public OSC: OSC | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	getConfigFields() {
		return GetConfigFields()
	}

	async configUpdated(config: ZoomRoomsConfig): Promise<void> {
		this.config = config
		this.saveConfig(config)
		if (this.OSC) {
			this.OSC.destroy()
			this.OSC = null
		}
		this.OSC = new OSC(this)
		this.updateInstance()
	}

	async init(config: ZoomRoomsConfig): Promise<void> {
		this.log('info', 'Zoom Rooms (CAVZRC) module initializing')
		await this.configUpdated(config)
	}

	async destroy(): Promise<void> {
		this.OSC?.destroy()
		this.OSC = null
		this.state = createDefaultState()
	}

	updateVariableValues(): void {
		updateVariableValues(this)
	}

	refreshVariableDefinitions(): void {
		initVariableDefinitions(this)
	}

	updateInstance(): void {
		initVariableDefinitions(this)
		this.updateVariableValues()
		this.setActionDefinitions(GetActions(this))
		this.setFeedbackDefinitions(GetFeedbacks(this))
		this.setPresetDefinitions(GetPresetList(this))
	}
}

runEntrypoint(ZoomRoomsInstanceImpl, UpgradeScripts)
