'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Headphones,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Store,
} from 'lucide-react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { chatApi } from '../api/chat.api';
import { useBuyerAssistant } from '../context/buyer-assistant-provider';
import type { ChatMessageDto, ChatThreadItem } from '../types/chat.types';

function formatMessageTime(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
      })
    : d.toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
      });
}

function makeClientMsgId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSupportThread(thread: Pick<ChatThreadItem, 'channelType'>): boolean {
  return thread.channelType === 'BUYER_SUPPORT' || thread.channelType === 'AI_BOT';
}

export function BuyerInboxPanel() {
  const { user } = useSession();
  const {
    isOpen,
    setIsOpen,
    activeWidgetView,
    activeThreadId,
    openConversationThread,
    openAssistantChat,
    returnToInbox,
    inboxThreads,
    inboxLoading,
    inboxError,
    refreshInbox,
    markConversationRead,
  } = useBuyerAssistant();

  const activeThread = useMemo(
    () => inboxThreads.find((t) => t.id === activeThreadId) ?? null,
    [activeThreadId, inboxThreads],
  );

  const [threadMessages, setThreadMessages] = useState<ChatMessageDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const reqSeqRef = useRef(0);
  const lastMarkedSeqRef = useRef<Record<string, number>>({});
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const prevTailKeyRef = useRef('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollThreadToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = listContainerRef.current;
    if (!container) return;
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    if (behavior === 'auto') {
      container.scrollTop = maxTop;
      return;
    }
    container.scrollTo({ top: maxTop, behavior: 'smooth' });
  }, []);

  const loadThreadMessages = useCallback(async (threadId: string, showSpinner: boolean) => {
    const reqSeq = reqSeqRef.current;
    if (showSpinner) {
      setLoadingMessages(true);
      setMessagesError('');
    }
    try {
      const items = await chatApi.getMessages(threadId, { limit: 50 });
      if (reqSeq !== reqSeqRef.current) return;
      const sorted = [...items].sort((a, b) => {
        const aSeq = Number(a.seq ?? 0);
        const bSeq = Number(b.seq ?? 0);
        if (aSeq && bSeq && aSeq !== bSeq) return aSeq - bSeq;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setThreadMessages(sorted);
      setMessagesError('');
    } catch {
      if (reqSeq !== reqSeqRef.current) return;
      if (showSpinner) {
        setMessagesError('Chưa tải được lịch sử tin nhắn. Vui lòng thử lại.');
      }
    } finally {
      if (showSpinner && reqSeq === reqSeqRef.current) {
        setLoadingMessages(false);
      }
    }
  }, []);

  // Tải & poll tin nhắn khi đang mở đúng phòng trong widget
  useEffect(() => {
    reqSeqRef.current += 1;
    prevTailKeyRef.current = '';
    setThreadMessages([]);
    setMessagesError('');
    setSendError('');

    if (!isOpen || activeWidgetView !== 'THREAD' || !activeThreadId) {
      setLoadingMessages(false);
      return;
    }

    void loadThreadMessages(activeThreadId, true);
    window.setTimeout(() => inputRef.current?.focus(), 40);

    const timer = window.setInterval(() => {
      void loadThreadMessages(activeThreadId, false);
    }, 3000);

    return () => {
      reqSeqRef.current += 1;
      window.clearInterval(timer);
    };
  }, [activeThreadId, activeWidgetView, isOpen, loadThreadMessages]);

  // Cuộn khung tin nhắn nội bộ khi mở phòng hoặc có tin nhắn mới tới
  const tailMsg = threadMessages[threadMessages.length - 1];
  const tailKey = tailMsg
    ? `${tailMsg.conversationId}:${tailMsg.seq ?? ''}:${tailMsg.id}:${tailMsg.createdAt}`
    : '';

  useEffect(() => {
    if (!tailKey) {
      prevTailKeyRef.current = '';
      return;
    }
    if (!isOpen || activeWidgetView !== 'THREAD' || loadingMessages) return;
    if (prevTailKeyRef.current !== tailKey) {
      const isInitial = !prevTailKeyRef.current;
      prevTailKeyRef.current = tailKey;
      let cancelled = false;
      let frame2 = 0;
      let settleTimer = 0;
      const frame1 = window.requestAnimationFrame(() => {
        frame2 = window.requestAnimationFrame(() => {
          if (cancelled) return;
          scrollThreadToBottom(isInitial ? 'auto' : 'smooth');
          settleTimer = window.setTimeout(
            () => {
              if (!cancelled) scrollThreadToBottom('auto');
            },
            isInitial ? 50 : 300,
          );
        });
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(frame1);
        if (frame2) window.cancelAnimationFrame(frame2);
        if (settleTimer) window.clearTimeout(settleTimer);
      };
    }
  }, [activeWidgetView, isOpen, loadingMessages, scrollThreadToBottom, tailKey]);

  // Chỉ đánh dấu đã đọc khi phòng đang mở, nội dung đã hiển thị và tab đang được xem
  const maxDisplayedSeq = useMemo(
    () =>
      threadMessages.reduce(
        (max, m) => (typeof m.seq === 'number' && m.seq > max ? m.seq : max),
        0,
      ),
    [threadMessages],
  );

  const syncVisibleReadCursor = useCallback(() => {
    if (
      !isOpen ||
      activeWidgetView !== 'THREAD' ||
      !activeThreadId ||
      loadingMessages ||
      Boolean(messagesError) ||
      maxDisplayedSeq <= 0
    ) {
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    const alreadyMarked = lastMarkedSeqRef.current[activeThreadId] ?? 0;
    const serverCursor = activeThread?.myLastReadSeq ?? 0;
    const targetSeq = maxDisplayedSeq;
    if (
      targetSeq > alreadyMarked &&
      (targetSeq > serverCursor || (activeThread?.unreadCount ?? 0) > 0)
    ) {
      lastMarkedSeqRef.current[activeThreadId] = targetSeq;
      void markConversationRead(activeThreadId, targetSeq);
    }
  }, [
    activeThread?.myLastReadSeq,
    activeThread?.unreadCount,
    activeThreadId,
    activeWidgetView,
    isOpen,
    loadingMessages,
    markConversationRead,
    maxDisplayedSeq,
    messagesError,
  ]);

  useEffect(() => {
    syncVisibleReadCursor();
  }, [syncVisibleReadCursor]);

  useEffect(() => {
    const onVisible = () => syncVisibleReadCursor();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [syncVisibleReadCursor]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeThreadId || sending) return;

    setSending(true);
    setSendError('');
    const clientMessageId = makeClientMsgId();
    try {
      const res = await chatApi.sendMessage(activeThreadId, { content, clientMessageId }, 'BUYER');
      setDraft('');
      setThreadMessages((prev) =>
        prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message],
      );
      if (typeof res.message.seq === 'number' && res.message.seq > 0) {
        lastMarkedSeqRef.current[activeThreadId] = Math.max(
          lastMarkedSeqRef.current[activeThreadId] ?? 0,
          res.message.seq,
        );
      }
      void refreshInbox();
    } catch {
      setSendError('Không gửi được tin nhắn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  if (activeWidgetView === 'THREAD' && activeThreadId) {
    const supportRoom = activeThread ? isSupportThread(activeThread) : false;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Sub-header phòng chat */}
        <div className="flex items-center justify-between gap-2 border-b border-line bg-stone-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={returnToInbox}
              aria-label="Quay lại danh sách hội thoại"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    supportRoom ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {supportRoom ? (
                    <Headphones className="size-3" aria-hidden="true" />
                  ) : (
                    <Store className="size-3" aria-hidden="true" />
                  )}
                  {supportRoom ? 'Hỗ trợ' : 'Người bán'}
                </span>
                <span className="truncate text-xs font-bold text-stone-900">
                  {activeThread?.counterpartLabel || (supportRoom ? 'Bộ phận Hỗ trợ' : 'Người bán')}
                </span>
              </div>
              {activeThread?.orderCode && (
                <p className="truncate font-mono text-[11px] text-muted">
                  Đơn #{activeThread.orderCode}
                </p>
              )}
            </div>
          </div>

          {activeThread?.orderId && (
            <Link
              href={`/account/orders/${encodeURIComponent(activeThread.orderId)}`}
              onClick={() => setIsOpen(false)}
              className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[11px] font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span>Xem đơn</span>
              <ExternalLink className="size-3" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Nội dung tin nhắn */}
        <div
          ref={listContainerRef}
          style={{ overflowAnchor: 'none' }}
          className="flex-1 overflow-y-auto bg-stone-50/60 p-3.5 space-y-3"
        >
          {loadingMessages ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted">
              <Loader2 className="size-4 animate-spin text-brand-dark" />
              <span>Đang tải tin nhắn…</span>
            </div>
          ) : messagesError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-800 space-y-2">
              <p>{messagesError}</p>
              <button
                type="button"
                onClick={() => void loadThreadMessages(activeThreadId, true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 font-semibold hover:bg-red-100"
              >
                <RefreshCw className="size-3.5" />
                Thử lại
              </button>
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-xs text-muted">
              Chưa có tin nhắn nào trong phòng này. Hãy nhập nội dung bên dưới.
            </div>
          ) : (
            threadMessages.map((msg) => {
              const isSelf = msg.senderId === user?.id || msg.senderRole === 'BUYER';
              const isStaff = msg.senderRole === 'SUPPORT_STAFF';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                >
                  <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-muted">
                    <span className="font-semibold text-stone-700">
                      {isSelf ? 'Bạn' : isStaff ? 'Nhân viên hỗ trợ' : 'Người bán'}
                    </span>
                    <span>{formatMessageTime(msg.createdAt)}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed ${
                      isSelf
                        ? 'bg-stone-900 text-white'
                        : 'border border-line bg-white text-stone-900 shadow-2xs'
                    }`}
                  >
                    <p className="whitespace-pre-line break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ô gửi tin */}
        <form onSubmit={handleSend} className="border-t border-line bg-white p-3 space-y-2">
          {sendError && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-600">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (sendError) setSendError('');
              }}
              placeholder={supportRoom ? 'Nhắn cho Bộ phận Hỗ trợ…' : 'Nhắn cho Người bán…'}
              aria-label="Nhập tin nhắn"
              className="h-10 flex-1 rounded-xl border border-line bg-stone-50 px-3 text-xs sm:text-sm text-stone-900 focus:border-brand focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Gửi tin nhắn"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-dark text-white hover:bg-brand disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Danh sách hội thoại (INBOX)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line bg-stone-50 px-4 py-2.5">
        <span className="text-xs font-bold text-stone-800">Hội thoại với Người bán & Hỗ trợ</span>
        <button
          type="button"
          onClick={() => void refreshInbox()}
          aria-label="Làm mới danh sách tin nhắn"
          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <RefreshCw className={`size-3 ${inboxLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {inboxError && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-900"
        >
          <AlertCircle className="size-3.5 shrink-0 text-amber-700" />
          <span>{inboxError}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-stone-50/60 p-3 space-y-2">
        {inboxLoading && inboxThreads.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted">
            <Loader2 className="size-4 animate-spin text-brand-dark" />
            <span>Đang tải hộp thư…</span>
          </div>
        ) : inboxThreads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center space-y-3">
            <MessageCircle className="mx-auto size-7 text-stone-300" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-stone-800">Chưa có hội thoại nào</p>
              <p className="text-[11px] text-muted">
                Bạn có thể bắt đầu nhắn Người bán hoặc Hỗ trợ từ trang chi tiết đơn hàng của mình.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/account/orders"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-9 items-center rounded-xl bg-brand-dark px-3 text-xs font-semibold text-white hover:bg-brand"
              >
                Xem đơn của tôi
              </Link>
              <button
                type="button"
                onClick={openAssistantChat}
                className="inline-flex min-h-9 items-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              >
                Hỏi Trợ lý AI
              </button>
            </div>
          </div>
        ) : (
          inboxThreads.map((thread) => {
            const supportRoom = isSupportThread(thread);
            const unread = Math.max(0, Number(thread.unreadCount || 0));
            const unreadBadge = unread > 99 ? '99+' : String(unread);
            const roleLabel = supportRoom ? 'Hỗ trợ' : 'Người bán';
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => openConversationThread(thread.id)}
                aria-label={`${roleLabel}: ${thread.counterpartLabel || ''}, đơn ${thread.orderCode}${
                  unread > 0 ? `, ${unread} tin chưa đọc` : ''
                }`}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  unread > 0
                    ? 'border-brand/30 bg-white shadow-xs hover:border-brand/60'
                    : 'border-line bg-white hover:border-stone-300'
                }`}
              >
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
                    supportRoom
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {supportRoom ? (
                    <Headphones className="size-4.5" aria-hidden="true" />
                  ) : (
                    <Store className="size-4.5" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          supportRoom
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {roleLabel}
                      </span>
                      <span className="truncate text-xs font-bold text-stone-900">
                        {thread.counterpartLabel || roleLabel}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted tabular-nums">
                      {formatMessageTime(thread.lastMessageTime)}
                    </span>
                  </div>

                  <p className="truncate font-mono text-[11px] text-stone-500">
                    Đơn #{thread.orderCode}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-xs ${
                        unread > 0 ? 'font-semibold text-stone-900' : 'text-muted'
                      }`}
                    >
                      {thread.lastMessage || 'Bấm để mở phòng trò chuyện'}
                    </p>
                    {unread > 0 && (
                      <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white tabular-nums">
                        {unreadBadge}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
