'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Message, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { Send, ArrowLeft } from 'lucide-react';

export default function ChatPage() {
  const { id: otherId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !otherId) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', otherId)
      .maybeSingle()
      .then(({ data }) => setOther(data));

    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user!.id})`
        )
        .order('created_at', { ascending: true });
      setMessages(data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    load();

    const channel = supabase
      .channel(`chat-${user.id}-${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message;
          const involves =
            (m.sender_id === user.id && m.receiver_id === otherId) ||
            (m.sender_id === otherId && m.receiver_id === user.id);
          if (involves) {
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m]
            );
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText('');
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: otherId,
      content,
    });
    setSending(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-discord-darker">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col border-x border-white/5">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <Link href="/messages" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href={`/u/${otherId}`} className="flex items-center gap-2">
            {other?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.avatar_url} alt="" className="h-8 w-8 rounded-full" />
            )}
            <span className="font-semibold text-white">
              {other?.display_name || other?.discord_username || 'Chat'}
            </span>
          </Link>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? 'bg-discord-blurple text-white'
                      : 'bg-discord-card text-gray-100'
                  }`}
                >
                  {m.content}
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-gray-500'}`}>
                    {new Date(m.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 border-t border-white/5 p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-white/10 bg-discord-card px-4 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-discord-blurple text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}