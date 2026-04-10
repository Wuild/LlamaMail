import type {RouteObject} from 'react-router-dom';
import {Navigate} from 'react-router-dom';
import MailPage from '../pages/MailPage';

export function buildMailRouteObjects(): RouteObject[] {
    return [
        {path: '/', element: <Navigate to="/email" replace/>},
        {path: '/email', element: <MailPage/>},
        {path: '/email/:accountId', element: <MailPage/>},
        {path: '/email/:accountId/:folderId', element: <MailPage/>},
        {path: '/email/:accountId/:folderId/:emailId', element: <MailPage/>},
        {path: '/mail/*', element: <Navigate to="/email" replace/>},
    ];
}

