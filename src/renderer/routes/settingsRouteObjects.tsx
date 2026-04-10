import type {RouteObject} from 'react-router-dom';
import {Navigate} from 'react-router-dom';
import SettingsRoute from './SettingsRoute';

export function buildSettingsRouteObjects(): RouteObject[] {
    return [
        {path: '/settings', element: <Navigate to="/settings/application" replace/>},
        {path: '/settings/:tab', element: <SettingsRoute/>},
        {path: '/settings/account/:accountId', element: <SettingsRoute/>},
    ];
}

