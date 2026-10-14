'use client';

import { FormEvent, useState } from 'react';
import './auth.css';
import { NexusLogo } from '@/shared/components/nexus-logo';

type AuthMode = 'login' | 'register';
type FieldName = 'identity' | 'email' | 'username' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.7" />
      {hidden && <path d="m4 20 16-16" stroke="currentColor" strokeWidth="1.7" />}
    </svg>
  );
}

export function AuthPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState({ identity: '', email: '', username: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');

  const isRegister = mode === 'register';

  function updateField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice('');
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrors({});
    setNotice('');
    setShowPassword(false);
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (isRegister) {
      if (!values.email.trim()) nextErrors.email = 'Vui lòng điền thông tin này';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        nextErrors.email = 'Vui lòng nhập email hợp lệ';
      }
      if (!values.username.trim()) nextErrors.username = 'Vui lòng điền thông tin này';
    } else if (!values.identity.trim()) {
      nextErrors.identity = 'Vui lòng điền thông tin này';
    } else if (values.identity.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.identity.trim())) {
        nextErrors.identity = 'Vui lòng nhập email hợp lệ';
      }
    } else if (!/^\+?[\d\s().-]{8,20}$/.test(values.identity.trim())) {
      nextErrors.identity = 'Vui lòng nhập email hoặc số điện thoại hợp lệ';
    }

    if (!values.password) nextErrors.password = 'Vui lòng điền thông tin này';
    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setNotice(
        isRegister
          ? 'Thông tin hợp lệ. Có thể kết nối API đăng ký sau.'
          : 'Thông tin hợp lệ. Có thể kết nối API đăng nhập sau.',
      );
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="auth-brand-group">
            <NexusLogo />
            <span className="auth-heading">{isRegister ? 'Đăng ký' : 'Đăng nhập'}</span>
          </div>
          <a className="help-link" href="#help">
            Bạn cần trợ giúp?
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
              <p>Khám phá hàng triệu sản phẩm và những phiên đấu giá đầy bất ngờ tại Nexus.</p>
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

          <section
            className="auth-card"
            aria-label={isRegister ? 'Biểu mẫu đăng ký' : 'Biểu mẫu đăng nhập'}
          >
            <div className="auth-tabs" role="tablist" aria-label="Chọn hình thức tài khoản">
              <button
                type="button"
                role="tab"
                aria-selected={!isRegister}
                className={!isRegister ? 'active' : ''}
                onClick={() => selectMode('login')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isRegister}
                className={isRegister ? 'active' : ''}
                onClick={() => selectMode('register')}
              >
                Đăng ký
              </button>
            </div>

            <form className="auth-form" noValidate onSubmit={handleSubmit}>
              {isRegister ? (
                <>
                  <div className="form-field">
                    <label htmlFor="auth-email">Email</label>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="example@email.com"
                      value={values.email}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'auth-email-error' : undefined}
                      onChange={(event) => updateField('email', event.target.value)}
                    />
                    {errors.email && (
                      <span className="field-error" id="auth-email-error">
                        {errors.email}
                      </span>
                    )}
                  </div>
                  <div className="form-field">
                    <label htmlFor="auth-username">Tên đăng nhập</label>
                    <input
                      id="auth-username"
                      type="text"
                      autoComplete="username"
                      placeholder="Tên bạn muốn sử dụng"
                      value={values.username}
                      aria-invalid={Boolean(errors.username)}
                      aria-describedby={errors.username ? 'auth-username-error' : undefined}
                      onChange={(event) => updateField('username', event.target.value)}
                    />
                    {errors.username && (
                      <span className="field-error" id="auth-username-error">
                        {errors.username}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="form-field">
                  <label htmlFor="auth-identity">Email hoặc số điện thoại</label>
                  <input
                    id="auth-identity"
                    type="text"
                    autoComplete="username"
                    placeholder="Email hoặc số điện thoại"
                    value={values.identity}
                    aria-invalid={Boolean(errors.identity)}
                    aria-describedby={errors.identity ? 'auth-identity-error' : undefined}
                    onChange={(event) => updateField('identity', event.target.value)}
                  />
                  {errors.identity && (
                    <span className="field-error" id="auth-identity-error">
                      {errors.identity}
                    </span>
                  )}
                </div>
              )}

              <div className="form-field">
                <label htmlFor="auth-password">Mật khẩu</label>
                <div className={`password-wrap ${errors.password ? 'has-error' : ''}`}>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder="Nhập mật khẩu"
                    value={values.password}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'auth-password-error' : undefined}
                    onChange={(event) => updateField('password', event.target.value)}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    <EyeIcon hidden={!showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <span className="field-error" id="auth-password-error">
                    {errors.password}
                  </span>
                )}
              </div>

              {!isRegister && (
                <a className="forgot-link" href="#forgot-password">
                  Quên mật khẩu?
                </a>
              )}
              {notice && (
                <p className="form-notice" role="status">
                  {notice}
                </p>
              )}
              <button className="submit-button" type="submit">
                {isRegister ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP'}
              </button>
              <p className="form-terms">
                {isRegister
                  ? 'Bằng việc đăng ký, bạn đồng ý với '
                  : 'Đăng nhập đồng nghĩa bạn chấp nhận '}
                <a href="#terms">Điều khoản dịch vụ</a> và <a href="#privacy">Chính sách bảo mật</a>{' '}
                của Nexus.
              </p>
            </form>

            <div className="auth-alternate">
              <span>{isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}</span>
              <button type="button" onClick={() => selectMode(isRegister ? 'login' : 'register')}>
                {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="auth-footer" id="help">
        <div className="footer-inner">
          <div className="footer-columns">
            <section>
              <h2>CHĂM SÓC KHÁCH HÀNG</h2>
              <a href="#help">Trung tâm trợ giúp</a>
              <a href="#help">Hướng dẫn mua hàng</a>
              <a href="#help">Liên hệ Nexus</a>
            </section>
            <section>
              <h2>VỀ NEXUS</h2>
              <a href="#about">Giới thiệu về Nexus</a>
              <a href="#about">Điều khoản dịch vụ</a>
              <a href="#about">Chính sách bảo mật</a>
            </section>
            <section>
              <h2>THANH TOÁN</h2>
              <p>Visa · Mastercard · COD</p>
              <p>Chuyển khoản · Ví điện tử</p>
            </section>
            <section>
              <h2>ĐƠN VỊ VẬN CHUYỂN</h2>
              <p>Nexus Express · GHN</p>
              <p>GHTK · Viettel Post</p>
            </section>
            <section>
              <h2>THEO DÕI CHÚNG TÔI</h2>
              <a href="#social">Facebook</a>
              <a href="#social">Instagram</a>
              <a href="#social">TikTok</a>
            </section>
          </div>
          <div className="footer-bottom">
            <span>© 2026 NEXUS. BẢO LƯU MỌI QUYỀN.</span>
            <nav aria-label="Chính sách">
              <a href="#privacy">Chính sách bảo mật</a>
              <a href="#terms">Điều khoản</a>
              <a href="#shipping">Chính sách vận chuyển</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
