'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { chatApi } from '@/modules/chat/api/chat.api';
import type { ChatMessageDto, ChatThreadItem } from '@/modules/chat/types/chat.types';

const SUPPORT_QUICK_REPLIES = [
  '📋 Chào bạn, Nexus Support đã tiếp nhận yêu cầu khiếu nại của bạn về đơn hàng.',
  '📸 Bạn vui lòng gửi thêm ảnh chụp rõ mã vận đơn và góc nứt vỡ trên vỏ hộp nhé.',
  '🚚 Support đang đối soát với bưu cục GHN về lịch trình phát hàng của bưu tá.',
  '✅ Nexus đã phê duyệt yêu cầu hoàn tiền 100% cho bạn qua cổng thanh toán PayOS.',
  '📦 Sàn đã yêu cầu Người bán gửi hàng mới thay thế trong vòng 24 giờ tới.',
];

export function SupportChatPage() {
  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'URGENT' | 'ACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [resolvedNotice, setResolvedNotice] = useState<string | null>(null);
  const [showActionPanel, setShowActionPanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Tải danh sách các ca khiếu nại & hội thoại cần hỗ trợ
  useEffect(() => {
    let active = true;
    async function loadThreads() {
      try {
        const data = await chatApi.getSupportThreads();
        if (active) {
          setThreads(data);
          if (data.length > 0 && !selectedThreadId) {
            setSelectedThreadId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load support chat threads', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadThreads();
    return () => {
      active = false;
    };
  }, []);

  const activeThread = threads.find((t) => t.id === selectedThreadId);

  // 2. Tải tin nhắn khi đổi phòng chat
  useEffect(() => {
    if (!selectedThreadId) return;

    let active = true;
    async function fetchMsgs() {
      const msgs = await chatApi.getMessages(selectedThreadId);
      if (active) {
        setMessages(msgs);
        scrollToBottom();
      }
    }

    fetchMsgs();

    // Polling tự động mỗi 3 giây
    const interval = setInterval(() => {
      if (active) {
        chatApi.getMessages(selectedThreadId).then((newMsgs) => {
          if (active && newMsgs.length !== messages.length) {
            setMessages(newMsgs);
            scrollToBottom();
          }
        });
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedThreadId, messages.length]);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // 3. Gửi tin nhắn phản hồi của nhân viên CSKH
  async function handleSend(contentToSend?: string) {
    const text = (contentToSend ?? inputText).trim();
    if ((!text && !selectedImage) || sending || !selectedThreadId) return;

    setSending(true);
    try {
      const attachments = selectedImage
        ? [
            {
              url: selectedImage,
              mimeType: 'image/jpeg',
              filename: 'bien_ban_giai_quyet.jpg',
            },
          ]
        : undefined;

      const res = await chatApi.sendMessage(
        selectedThreadId,
        { content: text || 'Đã gửi biên bản xử lý đính kèm.', attachments },
        'SUPPORT_STAFF',
      );

      setMessages((prev) => [...prev, res.message]);
      setInputText('');
      setSelectedImage(null);
      scrollToBottom();

      // Cập nhật preview tin nhắn cuối
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThreadId
            ? {
                ...t,
                lastMessage: text || '[Biên bản đính kèm]',
                lastMessageTime: new Date().toISOString(),
                lastMessageRole: 'SUPPORT_STAFF',
                unreadCount: 0,
              }
            : t,
        ),
      );
    } catch (err) {
      console.error('Lỗi gửi tin nhắn support:', err);
    } finally {
      setSending(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Dung lượng tệp tối đa cho phép là 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleResolveCase() {
    setResolvedNotice('Đã lưu biên bản và đóng ca khiếu nại thành công!');
    setTimeout(() => setResolvedNotice(null), 4000);
  }

  const filteredThreads = threads.filter((t) => {
    const matchQuery =
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.supportCaseId && t.supportCaseId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchQuery) return false;
    if (filterTab === 'URGENT') return t.priority === 'URGENT';
    if (filterTab === 'ACTIVE') return t.orderStatus !== 'DELIVERED';
    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 170px)',
        minHeight: '560px',
        background: '#f8fafc',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          background: '#1e3a8a',
          color: '#ffffff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #172554',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>⚖️</span>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Cổng Hỗ Trợ Khách Hàng & Trọng Tài Tranh Chấp (Support Helpdesk)
            </h1>
            <p style={{ fontSize: '12px', margin: 0, color: '#bfdbfe' }}>
              Kênh BUYER_SUPPORT bảo mật cách ly · Tự động tiếp nhận từ Bot khiếu nại (Kịch bản C)
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
          <span
            style={{
              padding: '4px 10px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            ⚡ Cam kết SLA: 3 Giờ
          </span>
          <span style={{ color: '#93c5fd' }}>|</span>
          <span style={{ color: '#e0e7ff' }}>
            Hàng đợi: <strong>{threads.length}</strong> ca
          </span>
        </div>
      </div>

      {/* Thông báo phán quyết */}
      {resolvedNotice && (
        <div
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            borderBottom: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span>✅ {resolvedNotice}</span>
          <button
            type="button"
            onClick={() => setResolvedNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Thân giao diện 3 CỘT CHUẨN HELPDESK */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* CỘT 1: HÀNG ĐỢI TICKET & HỘI THOẠI */}
        <div
          style={{
            width: '300px',
            minWidth: '300px',
            maxWidth: '300px',
            flexShrink: 0,
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Tab lọc */}
          <div
            style={{
              display: 'flex',
              padding: '8px 12px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'URGENT', label: '🔴 Khẩn cấp' },
              { id: 'ACTIVE', label: 'Đang xử lý' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: filterTab === tab.id ? '#ffffff' : 'transparent',
                  color: filterTab === tab.id ? '#1e3a8a' : '#64748b',
                  boxShadow: filterTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ô tìm kiếm */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Tìm Case ID, tên khách, mã đơn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '12.5px',
                outline: 'none',
                background: '#f8fafc',
              }}
            />
          </div>

          {/* Danh sách ticket */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div
                style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}
              >
                Đang tải hàng đợi hỗ trợ...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div
                style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}
              >
                Không có yêu cầu khiếu nại nào trong bộ lọc này.
              </div>
            ) : (
              filteredThreads.map((item) => {
                const isSelected = item.id === selectedThreadId;
                const isUrgent = item.priority === 'URGENT';
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedThreadId(item.id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          flexShrink: 0,
                          background: isUrgent ? '#fee2e2' : '#fef3c7',
                          color: isUrgent ? '#991b1b' : '#92400e',
                        }}
                      >
                        {isUrgent ? '🔴 URGENT' : item.priority || 'NORMAL'}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          flexShrink: 0,
                          color: isUrgent ? '#dc2626' : '#64748b',
                        }}
                      >
                        ⏱️ SLA: còn {item.slaMinutesRemaining ?? 45}p
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.customerName}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Mã đơn: <strong>{item.orderCode}</strong>
                      {item.supportCaseId && ` · Case: ${item.supportCaseId}`}
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.disputeReason || item.lastMessage}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT 2: KHUNG CHAT GIẢI QUYẾT TRANH CHẤP */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          {activeThread ? (
            <>
              {/* Header của phòng chat */}
              <div
                style={{
                  padding: '12px 20px',
                  background: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activeThread.customerName}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Kênh BUYER_SUPPORT (Trọng tài)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Đơn hàng: <strong style={{ color: '#0f172a' }}>{activeThread.orderCode}</strong>{' '}
                    · Mã sự cố: <strong>{activeThread.supportCaseId || '#cs_live'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowActionPanel((prev) => !prev)}
                    title="Ẩn hoặc hiện cột hồ sơ chi tiết và phán quyết trọng tài bên phải"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: showActionPanel ? '#eff6ff' : '#ffffff',
                      color: showActionPanel ? '#1d4ed8' : '#475569',
                      border: '1px solid',
                      borderColor: showActionPanel ? '#93c5fd' : '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {showActionPanel ? '📋 Thu gọn hồ sơ' : '📋 Mở hồ sơ'}
                  </button>
                  <Link
                    href={`/support/orders/${activeThread.orderId}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    🔍 Tra cứu chi tiết đơn
                  </Link>
                </div>
              </div>

              {/* Bot Handoff Summary Banner */}
              <div
                style={{
                  background: '#eff6ff',
                  borderBottom: '1px solid #dbeafe',
                  padding: '10px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '12.5px',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '24px' }}>🤖</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>
                    Biên bản bàn giao tự động từ Chatbot AI (Escalation Case):
                  </div>
                  <div style={{ color: '#1e3a8a', lineHeight: 1.5 }}>
                    {activeThread.disputeReason ||
                      'Khách hàng khiếu nại sản phẩm bị nứt vỡ khi mở hộp, yêu cầu can thiệp đổi mới theo Điều 3.6 Quy chế sàn.'}
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {messages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      padding: '40px 0',
                      fontSize: '13px',
                    }}
                  >
                    Chưa có tin nhắn nào. Bạn có thể gửi phản hồi ban đầu cho khách hàng dưới đây.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.senderRole === 'SUPPORT_STAFF';
                    const isAi = msg.senderRole === 'AI' || msg.senderRole === 'SYSTEM';

                    if (isAi) {
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: 'center',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            padding: '6px 14px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: 500,
                            maxWidth: '80%',
                            textAlign: 'center',
                          }}
                        >
                          🤖 {msg.content}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isStaff ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isStaff ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            marginBottom: '4px',
                            padding: '0 4px',
                          }}
                        >
                          {isStaff ? 'Support Staff (Bạn)' : activeThread.customerName} ·{' '}
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        <div
                          style={{
                            background: isStaff ? '#2563eb' : '#ffffff',
                            color: isStaff ? '#ffffff' : '#0f172a',
                            padding: '10px 14px',
                            borderRadius: isStaff ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                            fontSize: '13.5px',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            border: isStaff ? 'none' : '1px solid #e2e8f0',
                          }}
                        >
                          {msg.content}

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              {msg.attachments.map((att, i) => (
                                <div key={i} style={{ borderRadius: '8px', overflow: 'hidden' }}>
                                  {att.mimeType?.startsWith('image/') ? (
                                    <img
                                      src={att.url}
                                      alt="Evidence"
                                      style={{
                                        maxWidth: '260px',
                                        maxHeight: '200px',
                                        borderRadius: '8px',
                                        display: 'block',
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => window.open(att.url, '_blank')}
                                    />
                                  ) : (
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: isStaff ? '#bfdbfe' : '#2563eb',
                                        fontSize: '12px',
                                      }}
                                    >
                                      📎 {att.filename || 'Tệp đính kèm'}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick response templates */}
              <div
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minWidth: 0,
                }}
              >
                {SUPPORT_QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(reply)}
                    style={{
                      flexShrink: 0,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '5px 12px',
                      fontSize: '11.5px',
                      color: '#1e3a8a',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    {reply.length > 35 ? reply.slice(0, 35) + '...' : reply}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div
                style={{
                  padding: '14px 20px',
                  background: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexShrink: 0,
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*,video/mp4"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  title="Đính kèm biên bản / ảnh bằng chứng"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  📎
                </button>

                <input
                  type="text"
                  placeholder="Nhập nội dung trao đổi / hướng dẫn cho khách hàng (Enter để gửi)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '0 14px',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />

                <button
                  type="button"
                  disabled={sending || (!inputText.trim() && !selectedImage)}
                  onClick={() => handleSend()}
                  style={{
                    height: '40px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    background:
                      sending || (!inputText.trim() && !selectedImage) ? '#94a3b8' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor:
                      sending || (!inputText.trim() && !selectedImage) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sending ? 'Đang gửi...' : 'Gửi 🚀'}
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
              }}
            >
              <span style={{ fontSize: '48px' }}>⚖️</span>
              <div
                style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginTop: '12px' }}
              >
                Chọn một hồ sơ tranh chấp từ hàng đợi bên trái để xử lý
              </div>
            </div>
          )}
        </div>

        {/* CỘT 3: ACTION & POLICY COPILOT PANEL */}
        {activeThread && showActionPanel && (
          <div
            style={{
              width: '300px',
              minWidth: '300px',
              maxWidth: '300px',
              flexShrink: 0,
              background: '#ffffff',
              borderLeft: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '16px',
              gap: '16px',
            }}
          >
            {/* 1. Tóm tắt đơn hàng */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}
              >
                📦 Chi tiết đơn hàng
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                <div>
                  Mã đơn: <strong>{activeThread.orderCode}</strong>
                </div>
                <div>Sản phẩm: {activeThread.productTitle}</div>
                <div>
                  Tổng tiền:{' '}
                  <strong>
                    {new Intl.NumberFormat('vi-VN').format(activeThread.totalAmount)} ₫
                  </strong>
                </div>
                <div>
                  Khách: {activeThread.customerName} ({activeThread.customerPhone})
                </div>
              </div>
            </div>

            {/* 2. Tra cứu vận đơn GHN trực tiếp */}
            <div
              style={{
                background: '#f0fdf4',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}
              >
                🚚 Đối soát bưu tá GHN
              </div>
              <div style={{ fontSize: '12px', color: '#14532d', lineHeight: 1.5 }}>
                <div>
                  Mã vận đơn: <strong>GHN777323334VN</strong>
                </div>
                <div>
                  Hiện tại: <strong>Kho trung chuyển An Giang</strong>
                </div>
                <div>Trạng thái: Đã bàn giao cho bưu cục</div>
              </div>
              <Link
                href="/support/shipments"
                style={{
                  display: 'inline-block',
                  marginTop: '8px',
                  fontSize: '11.5px',
                  color: '#15803d',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Mở bảng đối soát GHN chi tiết →
              </Link>
            </div>

            {/* 3. Căn cứ Quy chế sàn (RAG Policy Grounding) */}
            <div
              style={{
                background: '#fefce8',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #fef08a',
              }}
            >
              <div
                style={{ fontSize: '13px', fontWeight: 700, color: '#854d0e', marginBottom: '6px' }}
              >
                📚 Căn cứ quy chế sàn áp dụng
              </div>
              <div style={{ fontSize: '11.5px', color: '#713f12', lineHeight: 1.5 }}>
                • <strong>Điều 3.6 (Đổi trả do nứt vỡ):</strong> Khách hàng được quyền yêu cầu hoàn
                tiền 100% nếu có ảnh chụp mở hộp trong 48h kể từ lúc ký nhận.
              </div>
            </div>

            {/* 4. Cụm nút phán quyết trọng tài */}
            <div
              style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                ⚡ Phán quyết trọng tài 1-chạm:
              </div>

              <Link
                href={`/support/orders/${activeThread.orderId}`}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                💸 Duyệt hoàn tiền đơn hàng
              </Link>

              <Link
                href="/support/disputes"
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  color: '#1e3a8a',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                ⚖️ Mở hồ sơ trọng tài vụ việc
              </Link>

              <button
                type="button"
                onClick={handleResolveCase}
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🔒 Đóng ca & Lưu biên bản
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
