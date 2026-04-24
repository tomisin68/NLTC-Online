import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useBackendFetch } from '../hooks/useBackendFetch';
import { showToast } from '../contexts/ToastContext';
import '../styles/payment-result.css';

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const backendFetch = useBackendFetch();

  const status = params.get('status');     // 'success' | 'failed' | 'cancelled'
  const plan = params.get('plan');         // 'pro' | 'elite'
  const reference = params.get('reference');

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(status === 'success');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status !== 'success' || !reference || !currentUser) return;
    setVerifying(true);
    backendFetch('GET', `/paystack/verify?reference=${reference}`)
      .then(async (res) => {
        const data = res.data || res;
        if (data.status === 'success' && data.plan) {
          await updateDoc(doc(db, 'users', currentUser.uid), { plan: data.plan });
          setVerified(true);
          showToast(`Plan upgraded to ${data.plan}!`, 'success');
        } else {
          setError('Payment could not be verified. Contact support if payment was deducted.');
        }
      })
      .catch(() => {
        setError('Verification request failed. If payment was deducted, contact support.');
      })
      .finally(() => setVerifying(false));
  }, [status, reference, currentUser, backendFetch]);

  const isSuccess = status === 'success' && verified;
  const isFailed = status === 'failed' || status === 'cancelled';
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '';

  return (
    <div className="pr-root">
      <div className="pr-card">
        {verifying ? (
          <>
            <div className="pr-spinner" />
            <h2 className="pr-title">Verifying payment…</h2>
            <p className="pr-sub">Please wait while we confirm your transaction.</p>
          </>
        ) : isSuccess ? (
          <>
            <div className="pr-icon pr-icon-success">
              <i className="fas fa-check" />
            </div>
            <h2 className="pr-title">Payment Successful!</h2>
            <p className="pr-sub">
              Your account has been upgraded to the <strong>{planLabel}</strong> plan.
              {plan === 'pro' && ' You now have access to all video lessons and live classes.'}
              {plan === 'elite' && ' You now have full access including 1-on-1 tutoring.'}
            </p>
            {reference && (
              <div className="pr-ref">
                <span className="pr-ref-label">Reference:</span>
                <code className="pr-ref-code">{reference}</code>
              </div>
            )}
            <button className="btn-gold pr-btn" onClick={() => navigate('/dashboard')}>
              Go to Dashboard <i className="fas fa-arrow-right" />
            </button>
          </>
        ) : isFailed ? (
          <>
            <div className="pr-icon pr-icon-error">
              <i className="fas fa-times" />
            </div>
            <h2 className="pr-title">
              {status === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed'}
            </h2>
            <p className="pr-sub">
              {status === 'cancelled'
                ? 'You cancelled the payment. No charge was made.'
                : 'Your payment could not be processed. Please try again.'}
            </p>
            <div className="pr-actions">
              <button className="btn-gold pr-btn" onClick={() => navigate('/dashboard?view=settings')}>
                Try Again
              </button>
              <button className="btn-outline pr-btn-sec" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </>
        ) : error ? (
          <>
            <div className="pr-icon pr-icon-warn">
              <i className="fas fa-exclamation-triangle" />
            </div>
            <h2 className="pr-title">Verification Issue</h2>
            <p className="pr-sub">{error}</p>
            {reference && (
              <div className="pr-ref">
                <span className="pr-ref-label">Reference:</span>
                <code className="pr-ref-code">{reference}</code>
              </div>
            )}
            <div className="pr-actions">
              <button className="btn-outline pr-btn-sec" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="pr-icon pr-icon-warn">
              <i className="fas fa-question-circle" />
            </div>
            <h2 className="pr-title">Unknown Status</h2>
            <p className="pr-sub">We couldn't determine your payment status. Contact support with your reference if needed.</p>
            <button className="btn-outline pr-btn-sec" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </>
        )}

        <div className="pr-support">
          Need help? Email <a href="mailto:nltcglobalservices@gmail.com">nltcglobalservices@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
