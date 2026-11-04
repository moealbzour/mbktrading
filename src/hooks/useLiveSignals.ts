import { useSignalsContext, ChannelSignalItem, BotAlertItem } from '../context/SignalsContext';
export type { ChannelSignalItem, BotAlertItem };

export function useLiveSignals() {
  return useSignalsContext();
}
