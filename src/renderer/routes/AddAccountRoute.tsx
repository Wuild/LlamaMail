import {useNavigate} from 'react-router-dom';
import SettingsAddAccount from '../pages/SettingsAddAccount';

type AddAccountRouteProps = {
    hasAccounts: boolean;
};

export default function AddAccountRoute({hasAccounts}: AddAccountRouteProps) {
    const navigate = useNavigate();

    return (
        <SettingsAddAccount
            embedded
            onCompleted={() => {
                navigate('/email', {replace: true});
            }}
            onCancel={() => {
                navigate(hasAccounts ? '/settings/application' : '/onboarding', {replace: true});
            }}
        />
    );
}

