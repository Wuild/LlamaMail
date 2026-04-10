import type {RouteObject} from 'react-router-dom';
import {Navigate} from 'react-router-dom';
import DebugConsolePage from '../pages/DebugConsolePage';
import SupportPage from '../pages/SupportPage';

export function buildUtilityRouteObjects(showDebugNavItem: boolean): RouteObject[] {
    return [
        {
            path: '/debug',
            element: showDebugNavItem ? <DebugConsolePage embedded/> : <Navigate to="/settings/developer" replace/>,
        },
        {path: '/help', element: <SupportPage embedded/>},
    ];
}

