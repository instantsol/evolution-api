export class SettingsDto {
  reject_call?: boolean;
  msg_call?: string;
  groups_ignore?: boolean;
  always_online?: boolean;
  read_messages?: boolean;
  read_status?: boolean;
  sync_full_history?: boolean;
  ignore_list?: string[];
  media_types?: string[];
  initial_connection?: number;
}
