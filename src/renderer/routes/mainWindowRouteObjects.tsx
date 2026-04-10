import type {RouteObject} from 'react-router-dom';
import {Navigate} from 'react-router-dom';
import AddAccountRoute from './AddAccountRoute';
import {buildFeatureRouteObjects} from './featureRouteObjects';
import {buildMailRouteObjects} from './mailRouteObjects';
import type {MainWindowRouteContext} from './mainWindowRouteContext';
import OnboardingRoute from './OnboardingRoute';
import {buildSettingsRouteObjects} from './settingsRouteObjects';
import {buildUtilityRouteObjects} from './utilityRouteObjects';

export function buildMainWindowRouteObjects(
    context: MainWindowRouteContext,
    showDebugNavItem: boolean,
): RouteObject[] {
    const hasAccounts = context.accounts.length > 0;
    if (!hasAccounts) {
        return [
            {path: '/', element: <Navigate to="/onboarding" replace/>},
            {path: '/onboarding', element: <OnboardingRoute hasAccounts={false}/>},
            {path: '/add-account', element: <AddAccountRoute hasAccounts={false}/>},
            {path: '*', element: <Navigate to="/onboarding" replace/>},
        ];
    }

    return [
        {path: '/onboarding', element: <Navigate to="/email" replace/>},
        {path: '/add-account', element: <AddAccountRoute hasAccounts/>},
        ...buildMailRouteObjects(),
        ...buildFeatureRouteObjects(context),
        ...buildSettingsRouteObjects(),
        ...buildUtilityRouteObjects(showDebugNavItem),
        {path: '*', element: <Navigate to="/email" replace/>},
    ];
}
