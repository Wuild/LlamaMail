import {ExternalLink, FileText, Shield} from '@llamamail/ui/icon';
import {Button} from '@llamamail/ui/button';

const LEGAL_BASE_URL = 'https://llama.voracious.se/';
const PRIVACY_URL = 'https://llama.voracious.se/privacy';
const TOS_URL = 'https://llama.voracious.se/tos';

export default function SettingsLegalPage() {
	return (
		<div className="mx-auto h-full min-h-0 w-full max-w-5xl space-y-4 pb-4 md:pb-6">
			<section className="panel rounded-xl p-4">
				<h2 className="ui-text-primary text-base font-semibold">Legal</h2>
				<p className="ui-text-muted mt-1 text-sm">Privacy and terms for LlamaMail.</p>
				<div className="mt-4 grid gap-3 md:grid-cols-2">
					<div className="ui-border-default rounded-md border p-3">
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="ui-text-secondary text-sm font-medium">Privacy Policy</p>
								<p className="ui-text-muted mt-1 text-xs">How data is handled and protected.</p>
							</div>
							<Shield size={16} className="ui-text-muted" />
						</div>
						<Button
							type="button"
							variant="outline"
							className="mt-3 rounded-md px-3 py-2 text-sm"
							onClick={() => window.open(PRIVACY_URL, '_blank', 'noopener,noreferrer')}
							rightIcon={<ExternalLink size={14} />}
						>
							Open Privacy Policy
						</Button>
					</div>
					<div className="ui-border-default rounded-md border p-3">
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="ui-text-secondary text-sm font-medium">Terms of Service</p>
								<p className="ui-text-muted mt-1 text-xs">Usage terms and legal conditions.</p>
							</div>
							<FileText size={16} className="ui-text-muted" />
						</div>
						<Button
							type="button"
							variant="outline"
							className="mt-3 rounded-md px-3 py-2 text-sm"
							onClick={() => window.open(TOS_URL, '_blank', 'noopener,noreferrer')}
							rightIcon={<ExternalLink size={14} />}
						>
							Open Terms of Service
						</Button>
					</div>
				</div>
				<p className="ui-text-muted mt-4 text-xs">
					Official legal pages: <span className="font-medium">{LEGAL_BASE_URL}</span>
				</p>
			</section>
		</div>
	);
}
