'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { NexusLogo } from '@/components/layout/nexus-logo';
import { authApi } from '@/modules/auth/api/auth.api';
import { ApiError, userMessage } from '../../../lib/axios/http';
import { safeNextPath } from '../../../lib/utils/navigation';
import './auth.css';
type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password';
export function AuthPage({ initialMode = 'login' }: { initialMode?: Mode }) {
  const params = useSearchParams();
  const token = useRef(params?.get('token') || '');
  const [mode, setMode] = useState<Mode>(initialMode);
  const [values, setValues] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false);
  const [remember, setRemember] = useState(false);
  const summary = useRef<HTMLParagraphElement>(null);
  const isRegister = mode === 'register',
    isReset = mode === 'reset-password',
    isForgot = mode === 'forgot-password';
  const title = isRegister
    ? 'Tạo tài khoản Nexus'
    : isReset
      ? 'Đặt mật khẩu mới'
      : isForgot
        ? 'Quên mật khẩu'
        : 'Chào mừng bạn trở lại';
  const next = safeNextPath(params?.get('next'));
  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setErrors({});
    setNotice('');
    setSuccess(false);
    setValues((v) => ({ ...v, password: '', confirmPassword: '' }));
    setShown(false);
    history.pushState(
      null,
      '',
      '/' + nextMode + (next === '/' ? '' : '?next=' + encodeURIComponent(next)),
    );
  }
  useEffect(() => {
    const onBack = () => {
      const value = location.pathname.slice(1);
      if (['login', 'register', 'forgot-password', 'reset-password'].includes(value)) {
        setMode(value as Mode);
        setErrors({});
        setNotice('');
        setValues((v) => ({ ...v, password: '', confirmPassword: '' }));
      }
    };
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
  function field(key: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }
  function focusError() {
    requestAnimationFrame(() => summary.current?.focus());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const validation: Record<string, string> = {};
    if (!isReset && !/^\S+@\S+\.\S+$/.test(values.email.trim()))
      validation.email = 'Nhập địa chỉ email hợp lệ.';
    if (isRegister && (!values.fullName.trim() || values.fullName.trim().length > 100))
      validation.fullName = 'Nhập họ và tên từ 1 đến 100 ký tự.';
    if (
      !isForgot &&
      (!values.password ||
        (isRegister && values.password.length < 6) ||
        (isReset && values.password.length < 12))
    )
      validation.password = isReset
        ? 'Mật khẩu mới cần ít nhất 12 ký tự.'
        : isRegister
          ? 'Mật khẩu cần ít nhất 6 ký tự.'
          : 'Nhập mật khẩu của bạn.';
    if ((isRegister || isReset) && values.confirmPassword !== values.password)
      validation.confirmPassword = 'Mật khẩu xác nhận chưa trùng khớp.';
    if (isReset && !token.current)
      validation.token = 'Liên kết đặt lại mật khẩu chưa hợp lệ. Hãy gửi yêu cầu mới.';
    setErrors(validation);
    setSuccess(false);
    if (Object.keys(validation).length) {
      setNotice('Vui lòng kiểm tra các thông tin được đánh dấu.');
      focusError();
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      if (isForgot) {
        await authApi.requestPasswordReset(values.email.trim());
        setSuccess(true);
        setNotice(
          'Nếu tài khoản tồn tại, hệ thống sẽ cung cấp hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.',
        );
      } else if (isReset) {
        await authApi.resetPassword(token.current, values.password);
        token.current = '';
        history.replaceState(null, '', '/reset-password');
        setValues((v) => ({ ...v, password: '', confirmPassword: '' }));
        setSuccess(true);
        setNotice('Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại bằng mật khẩu mới.');
      } else {
        if (isRegister) {
          await authApi.register({
            email: values.email.trim(),
            fullName: values.fullName.trim(),
            password: values.password,
          });
          try {
            await authApi.login(values.email.trim(), values.password, remember);
          } catch {
            changeMode('login');
            setSuccess(true);
            setNotice('Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.');
            return;
          }
        } else {
          await authApi.login(values.email.trim(), values.password, remember);
        }
        const profile = await authApi.getProfile();
        if (profile.status !== 'ACTIVE') {
          throw new ApiError('Tài khoản chưa ở trạng thái hoạt động.', 423);
        }
        let destination = next;
        if (profile.role === 'ADMIN' && next === '/') destination = '/admin';
        else if (profile.role === 'BUYER' && next === '/') destination = '/';
        else if (profile.role === 'SELLER' && next === '/') destination = '/seller';
        else if (profile.role === 'BUYER' && next.startsWith('/admin')) destination = '/';
        window.location.assign(destination);
      }
    } catch (error) {
      const e = error instanceof ApiError ? error : null;
      setErrors(e?.fieldErrors ?? {});
      setNotice(
        e?.status === 423
          ? 'Tài khoản đang tạm khóa. Vui lòng thử lại sau thời gian quy định.'
          : e?.status === 401
            ? 'Email hoặc mật khẩu chưa chính xác.'
            : e?.status === 409
              ? 'Email này đã được sử dụng. Bạn có thể đăng nhập hoặc đặt lại mật khẩu.'
              : isReset && e?.status === 400
                ? 'Mật khẩu chưa hợp lệ hoặc liên kết đã hết hạn/được sử dụng. Hãy kiểm tra thông tin hoặc gửi yêu cầu mới.'
                : userMessage(error),
      );
      focusError();
    } finally {
      setBusy(false);
    }
  }
  function input(key: keyof typeof values, label: string, type = 'text', autoComplete?: string) {
    return (
      <div className="form-field">
        <label htmlFor={'auth-' + key}>{label}</label>
        <Input
          id={'auth-' + key}
          name={key}
          type={type}
          autoComplete={autoComplete}
          value={values[key]}
          onChange={(e) => field(key, e.target.value)}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? 'auth-error-' + key : undefined}
          maxLength={key === 'fullName' ? 100 : key === 'email' ? 254 : undefined}
        />
        {errors[key] && (
          <span className="field-error" id={'auth-error-' + key}>
            {errors[key]}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="auth-brand-group">
            <NexusLogo />
            <span className="auth-heading">
              {isRegister ? 'Đăng ký' : isForgot || isReset ? 'Khôi phục tài khoản' : 'Đăng nhập'}
            </span>
          </div>
          <a className="help-link" href="/">
            Về trang chủ
          </a>
        </div>
      </header>
      <main className="auth-main">
        <div className="auth-main-inner">
          <section className="auth-promo" aria-label="Thông điệp Nexus">
            <div className="promo-copy">
              <span className="promo-kicker">MỞ LỐI MUA SẮM MỚI</span>
              <h1>
                Chọn điều
                <br />
                bạn <span>yêu thích.</span>
              </h1>
              <p>Khám phá những sản phẩm và những phiên đấu giá đầy bất ngờ tại Nexus.</p>
              <div className="promo-perks">
                <span>
                  <b>✦</b> Săn ưu đãi mỗi ngày
                </span>
                <span>
                  <b>↗</b> Đấu giá theo cách của bạn
                </span>
              </div>
            </div>
            <div className="promo-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-spark spark-one">✦</div>
              <div className="art-spark spark-two">✧</div>
              <div className="art-bag">
                <div className="bag-handle" />
                <div className="bag-face">
                  <span>N</span>
                </div>
              </div>
              <div className="art-tag tag-sale">
                DEAL
                <br />
                <strong>HOT</strong>
              </div>
              <div className="art-tag tag-bid">
                BID
                <br />
                <strong>LIVE</strong>
              </div>
              <div className="art-ball ball-one" />
              <div className="art-ball ball-two" />
            </div>
          </section>
          <section className="auth-card" aria-labelledby="auth-title">
            <h2 id="auth-title" className="auth-week-title">
              {title}
            </h2>
            <p className="auth-week-description">
              {isReset
                ? 'Chỉ sử dụng liên kết khôi phục do hệ thống cung cấp.'
                : isForgot
                  ? 'Nhập email bạn đã dùng để đăng ký tài khoản.'
                  : 'Một tài khoản để khám phá những món đồ bạn yêu thích.'}
            </p>
            {!isForgot && !isReset && (
              <div className="auth-tabs">
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"
                  aria-pressed={!isRegister}
                  className={!isRegister ? 'active' : ''}
                  onClick={() => changeMode('login')}
                  disabled={busy}
                >
                  Đăng nhập
                </Button>
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"
                  aria-pressed={isRegister}
                  className={isRegister ? 'active' : ''}
                  onClick={() => changeMode('register')}
                  disabled={busy}
                >
                  Đăng ký
                </Button>
              </div>
            )}
            <form className="auth-form" noValidate onSubmit={submit} aria-busy={busy}>
              <fieldset disabled={busy} className="auth-week-fieldset">
                {!isReset && input('email', 'Email', 'email', 'email')}
                {isRegister && input('fullName', 'Họ và tên', 'text', 'name')}
                {!isForgot && (
                  <>
                    <div className="form-field">
                      <label htmlFor="auth-password">{isReset ? 'Mật khẩu mới' : 'Mật khẩu'}</label>
                      <div className="password-wrap">
                        <Input
                          id="auth-password"
                          name="password"
                          type={shown ? 'text' : 'password'}
                          autoComplete={isRegister || isReset ? 'new-password' : 'current-password'}
                          value={values.password}
                          onChange={(e) => field('password', e.target.value)}
                          aria-invalid={!!errors.password}
                          aria-describedby={
                            errors.password ? 'auth-password-error' : 'auth-password-hint'
                          }
                        />
                        <Button
                          variant="ghost"
                          size="plain"
                          type="button"
                          className="password-toggle"
                          onClick={() => setShown(!shown)}
                          aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          aria-pressed={shown}
                        >
                          {shown ? 'Ẩn' : 'Hiện'}
                        </Button>
                      </div>
                      {errors.password ? (
                        <span className="field-error" id="auth-password-error">
                          {errors.password}
                        </span>
                      ) : (
                        <span id="auth-password-hint" className="auth-week-hint">
                          {isReset
                            ? 'Tối thiểu 12 ký tự.'
                            : isRegister
                              ? 'Tối thiểu 6 ký tự.'
                              : 'Mật khẩu phân biệt chữ hoa và chữ thường.'}
                        </span>
                      )}
                    </div>
                    {(isRegister || isReset) &&
                      input(
                        'confirmPassword',
                        'Xác nhận mật khẩu',
                        shown ? 'text' : 'password',
                        'new-password',
                      )}
                  </>
                )}
                {mode === 'login' && (
                  <div className="auth-week-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      Ghi nhớ đăng nhập
                    </label>
                    <Button
                      variant="ghost"
                      size="plain"
                      type="button"
                      className="auth-week-text-button"
                      onClick={() => changeMode('forgot-password')}
                    >
                      Quên mật khẩu?
                    </Button>
                  </div>
                )}
                {notice && (
                  <p
                    ref={summary}
                    tabIndex={-1}
                    className={'form-notice ' + (success ? 'success' : 'error')}
                    role={success ? 'status' : 'alert'}
                  >
                    {notice}
                  </p>
                )}
                {errors.token && (
                  <p className="field-error" role="alert">
                    {errors.token}
                  </p>
                )}
                {!(isReset && success) && (
                  <Button
                    variant="ghost"
                    size="plain"
                    type="submit"
                    className="submit-button"
                    disabled={busy}
                  >
                    {busy
                      ? 'ĐANG XỬ LÝ…'
                      : isRegister
                        ? 'TẠO TÀI KHOẢN'
                        : isForgot
                          ? 'GỬI HƯỚNG DẪN'
                          : isReset
                            ? 'LƯU MẬT KHẨU MỚI'
                            : 'ĐĂNG NHẬP'}
                  </Button>
                )}
              </fieldset>
            </form>
            {(isForgot || isReset) && (
              <div className="auth-alternate">
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"
                  disabled={busy}
                  onClick={() => changeMode('login')}
                >
                  Quay lại đăng nhập
                </Button>
                {isReset && (
                  <Button
                    variant="ghost"
                    size="plain"
                    type="button"
                    disabled={busy}
                    onClick={() => changeMode('forgot-password')}
                  >
                    Gửi liên kết mới
                  </Button>
                )}
              </div>
            )}
            {!isForgot && !isReset && (
              <div className="auth-alternate">
                <span>{isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
                <Button
                  variant="ghost"
                  size="plain"
                  type="button"
                  disabled={busy}
                  onClick={() => changeMode(isRegister ? 'login' : 'register')}
                >
                  {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
      <footer className="auth-footer">
        <div className="footer-inner">NEXUS · Khám phá giá trị, kết nối đam mê.</div>
      </footer>
    </div>
  );
}
