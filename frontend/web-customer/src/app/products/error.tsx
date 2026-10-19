'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="nexus-container py-16">
      <section role="alert" className="rounded-3xl border border-line bg-white p-10 text-center">
        <h1 className="text-2xl font-bold">Chưa mở được trang sản phẩm</h1>
        <p className="mt-3 text-sm text-muted">Bạn có thể tải lại trang hoặc quay về trang chủ.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
        >
          Thử lại
        </button>
        <a className="ml-5 inline-flex min-h-11 items-center text-sm font-semibold" href="/">
          Về trang chủ
        </a>
      </section>
    </main>
  );
}
