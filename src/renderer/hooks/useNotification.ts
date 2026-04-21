import {useNotificationStore} from '@renderer/store/notificationStore';

export function useNotification() {
	const create = useNotificationStore((state) => state.createNotification);
	const update = useNotificationStore((state) => state.updateNotification);
	const dismiss = useNotificationStore((state) => state.dismissNotification);
	const clear = useNotificationStore((state) => state.clearNotifications);
	const clearByCategory = useNotificationStore((state) => state.clearNotificationsByCategory);

	return {
		create,
		update,
		dismiss,
		clear,
		clearByCategory,
	};
}
