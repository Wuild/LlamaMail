import type {RouteObject} from 'react-router-dom';
import CloudFilesPage from '../pages/CloudFilesPage';
import CalendarRoute from './CalendarRoute';
import ContactsRoute from './ContactsRoute';
import type {MainWindowRouteContext} from './mainWindowRouteContext';

export function buildFeatureRouteObjects({
                                             accountId,
                                             accounts,
                                             onSelectAccount,
                                         }: MainWindowRouteContext): RouteObject[] {
    return [
        {path: '/cloud', element: <CloudFilesPage/>},
        {
            path: '/contacts',
            element: (
                <ContactsRoute
                    accountId={accountId}
                    accounts={accounts}
                    onSelectAccount={onSelectAccount}
                />
            ),
        },
        {
            path: '/calendar',
            element: (
                <CalendarRoute
                    accountId={accountId}
                    accounts={accounts}
                    onSelectAccount={onSelectAccount}
                />
            ),
        },
    ];
}

