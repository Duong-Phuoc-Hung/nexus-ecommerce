'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { chatApi } from '@/modules/chat/api/chat.api';
import type { ChatMessageDto, ChatThreadItem } from '@/modules/chat/types/chat.types';

const SELLER_QUICK_REPLIES = [
  '📦 Dạ shop đã đóng gói và chuẩn bị bàn giao cho bưu tá GHN rồi bạn nhé!',
  '📍 Bạn vui lòng kiểm tra lại số điện thoại và địa chỉ nhận hàng giúp shop nha.',
  '🛡️ Sản phẩm bên shop là hàng chính hãng 100%, bảo hành 12 tháng đầy đủ ạ.',
  '🚚 Đơn hàng đang được bưu tá giao, dự kiến sẽ phát trong hôm nay hoặc ngày mai ạ.',
  '📸 Shop gửi bạn ảnh chụp gói hàng nguyên vẹn trước khi xuất kho nhé!',
];

export function SellerChatPage() {
  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Tải danh sách các cuộc hội thoại
  useEffect(() => {
    let active = true;
    async function loadThreads() {
      try {
        const data = await chatApi.getSellerThreads();
        if (active) {
          setThreads(data);
          if (data.length > 0 && !selectedThreadId) {
            setSelectedThreadId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load seller chat threads', err);
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

    // Polling tự động mỗi 3 giây để cập nhật tin nhắn mới
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

  // 3. Gửi tin nhắn
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
              filename: 'anh_chup_dong_hang.jpg',
            },
          ]
        : undefined;

      const res = await chatApi.sendMessage(
        selectedThreadId,
        { content: text || 'Đã gửi một ảnh đính kèm.', attachments },
        'SELLER',
      );

      setMessages((prev) => [...prev, res.message]);
      setInputText('');
      setSelectedImage(null);
      scrollToBottom();

      // Cập nhật snippet tin nhắn cuối trong danh sách bên trái
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThreadId
            ? {
                ...t,
                lastMessage: text || '[Ảnh đính kèm]',
                lastMessageTime: new Date().toISOString(),
                lastMessageRole: 'SELLER',
                unreadCount: 0,
              }
            : t,
        ),
      );
    } catch (err) {
      console.error('Lỗi gửi tin nhắn seller:', err);
    } finally {
      setSending(false);
    }
  }

  // 4. Chọn ảnh đính kèm từ máy
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

  const filteredThreads = threads.filter(
    (t) =>
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.productTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 110px)',
        background: '#f8fafc',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Thanh tiêu đề Workspace */}
      <div
        style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>💬</span>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Trung Tâm Tin Nhắn Khách Hàng (Seller Chat Hub)
            </h1>
            <p style={{ fontSize: '12px', margin: 0, color: '#94a3b8' }}>
              Trao đổi trực tiếp với người mua theo từng đơn hàng · Bảo vệ bằng chứng giao nhận
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
              }}
            />
            Kết nối trực tiếp
          </span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ color: '#cbd5e1' }}>
            Tổng hội thoại: <strong>{threads.length}</strong>
          </span>
        </div>
      </div>

      {/* Thân giao diện 2 cột */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* CỘT TRÁI: Danh sách tài khoản đang chat */}
        <div
          style={{
            width: '360px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Ô tìm kiếm */}
          <div style={{ padding: '14px', borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>🔍</span>
              <input
                type="text"
                placeholder="Tìm khách hàng, mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  color: '#1e293b',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Danh sách thẻ hội thoại */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div
                style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}
              >
                Đang tải danh sách tin nhắn...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div
                style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}
              >
                Không tìm thấy cuộc hội thoại nào.
              </div>
            ) : (
              filteredThreads.map((item) => {
                const isSelected = item.id === selectedThreadId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedThreadId(item.id)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#fdf2f4' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #e11d48' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isSelected ? '#e11d48' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}
                        >
                          {item.customerName.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                            {item.customerName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.orderCode}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            item.orderStatus === 'PAID' || item.orderStatus === 'DELIVERED'
                              ? '#dcfce7'
                              : '#fef3c7',
                          color:
                            item.orderStatus === 'PAID' || item.orderStatus === 'DELIVERED'
                              ? '#166534'
                              : '#92400e',
                        }}
                      >
                        {item.orderStatus}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '4px',
                      }}
                    >
                      <span
                        style={{ color: item.lastMessageRole === 'SELLER' ? '#e11d48' : '#64748b' }}
                      >
                        {item.lastMessageRole === 'SELLER' ? 'Bạn: ' : ''}
                      </span>
                      {item.lastMessage}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Khung chat chi tiết */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          {activeThread ? (
            <>
              {/* Topbar của phòng chat */}
              <div
                style={{
                  padding: '12px 20px',
                  background: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      {activeThread.customerName}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontWeight: 600,
                      }}
                    >
                      Kênh BUYER_SELLER (Riêng tư)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    SĐT: {activeThread.customerPhone || '0963433678'} · Đơn hàng liên kết:{' '}
                    <strong style={{ color: '#0f172a' }}>{activeThread.orderCode}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href={`/seller/orders`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    📦 Xem hồ sơ đơn hàng
                  </Link>
                </div>
              </div>

              {/* Order Pin Banner */}
              <div
                style={{
                  background: '#fff1f2',
                  borderBottom: '1px solid #ffe4e6',
                  padding: '10px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>🏷️</span>
                  <div>
                    <span style={{ fontWeight: 600, color: '#9f1239' }}>Sản phẩm chốt đơn: </span>
                    <span style={{ color: '#881337' }}>
                      {activeThread.productTitle} (x{activeThread.productQuantity})
                    </span>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#e11d48', fontSize: '13px' }}>
                  Tổng tiền: {new Intl.NumberFormat('vi-VN').format(activeThread.totalAmount)} ₫
                </div>
              </div>

              {/* Cửa sổ hiển thị tin nhắn */}
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
                {/* Lời chào mẫu đầu kênh */}
                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                      background: '#e2e8f0',
                      padding: '4px 12px',
                      borderRadius: '12px',
                    }}
                  >
                    🔒 Cuộc trò chuyện được bảo mật bởi sàn Nexus. Vui lòng không giao dịch ngoài
                    sàn.
                  </span>
                </div>

                {messages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      padding: '40px 0',
                      fontSize: '13px',
                    }}
                  >
                    Chưa có tin nhắn nào. Bạn có thể gửi lời chào hoặc ảnh kiện hàng đóng gói bên
                    dưới!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderRole === 'SELLER';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
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
                          {isMe ? 'Shop (Bạn)' : activeThread.customerName} ·{' '}
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        <div
                          style={{
                            background: isMe ? '#e11d48' : '#ffffff',
                            color: isMe ? '#ffffff' : '#0f172a',
                            padding: '10px 14px',
                            borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                            fontSize: '13.5px',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            border: isMe ? 'none' : '1px solid #e2e8f0',
                          }}
                        >
                          {msg.content}

                          {/* Hiển thị tệp đính kèm nếu có */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              {msg.attachments.map((att, i) => (
                                <div key={i} style={{ borderRadius: '8px', overflow: 'hidden' }}>
                                  {att.mimeType?.startsWith('image/') ? (
                                    <img
                                      src={att.url}
                                      alt="Attachment"
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
                                        color: isMe ? '#ffe4e6' : '#2563eb',
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

              {/* Mẫu câu trả lời nhanh */}
              <div
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                {SELLER_QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(reply)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '5px 12px',
                      fontSize: '11.5px',
                      color: '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#e11d48')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    {reply.length > 35 ? reply.slice(0, 35) + '...' : reply}
                  </button>
                ))}
              </div>

              {/* Xem trước ảnh đính kèm trước khi bấm gửi */}
              {selectedImage && (
                <div
                  style={{
                    padding: '8px 16px',
                    background: '#fff1f2',
                    borderTop: '1px solid #ffe4e6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={selectedImage}
                      alt="Preview"
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#9f1239', fontWeight: 500 }}>
                      Đã đính kèm ảnh kiện hàng
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e11d48',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    ✕ Xóa ảnh
                  </button>
                </div>
              )}

              {/* Khung nhập tin nhắn */}
              <div
                style={{
                  padding: '14px 20px',
                  background: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
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
                  title="Đính kèm ảnh/video kiện hàng (tối đa 20MB)"
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
                  placeholder="Nhập tin nhắn phản hồi cho khách hàng (Enter để gửi)..."
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
                      sending || (!inputText.trim() && !selectedImage) ? '#94a3b8' : '#e11d48',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor:
                      sending || (!inputText.trim() && !selectedImage) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
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
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '48px' }}>💬</span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
                Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu chat
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
