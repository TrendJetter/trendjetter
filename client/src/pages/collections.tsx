import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Bookmark, Plus, Hash, ChevronRight, ArrowRight, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { TiltCard } from '@/components/AppAnimations';
import type { Collection, Hashtag } from '@shared/schema';

function scoreColor(s: number) {
  if (s >= 75) return '#16A34A'; if (s >= 55) return '#0891B2';
  if (s >= 35) return '#D97706'; return '#DC2626';
}

function CreateBar({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/collections', { name, description: '' }).then(r => r.json()),
    onSuccess: () => { setName(''); setOpen(false); queryClient.invalidateQueries({ queryKey: ['/api/collections'] }); onCreated(); },
    onError: () => toast({ title: 'Failed to create', variant: 'destructive' }),
  });
  if (!open) return (
    <button onClick={() => setOpen(true)} data-testid="button-new-collection"
      className="btn-secondary text-[13px] py-2 px-4 flex items-center gap-1.5">
      <Plus size={13} /> New collection
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <input autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) mutation.mutate(); if (e.key === 'Escape') setOpen(false); }}
        placeholder="Collection name…" data-testid="input-collection-name"
        className="h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[13px] text-[#111111] placeholder:text-[#D4D4D8] focus:outline-none focus:border-[#111111] transition-colors w-48"
        style={{ fontFamily: 'Inter, sans-serif' }}
      />
      <button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}
        className="btn-primary text-[13px] py-2 px-4 flex items-center gap-1.5 disabled:opacity-50">
        {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create
      </button>
      <button onClick={() => setOpen(false)} className="text-[12px] text-[#A1A1AA] hover:text-[#111111] transition-colors cursor-pointer">Cancel</button>
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const [expanded, setExpanded] = useState(false);
  const { data: tags, isLoading } = useQuery<Hashtag[]>({
    queryKey: ['/api/collections', collection.id, 'tags'],
    queryFn: () => apiRequest('GET', `/api/collections/${collection.id}/tags`).then(r => r.json()),
    enabled: expanded,
  });

  return (
    <TiltCard intensity={8}>
    <div className="bento-tile overflow-hidden p-0" data-testid={`collection-${collection.id}`}>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-[#FAFAFA] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center">
            {expanded ? <FolderOpen size={14} className="text-[#111111]" /> : <Folder size={14} className="text-[#71717A]" />}
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#111111] leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>{collection.name}</p>
            <p className="text-[12px] text-[#A1A1AA]">{collection.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#A1A1AA]">{new Date(collection.createdAt!).toLocaleDateString()}</span>
          <ChevronRight size={13} className={`text-[#D4D4D8] transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-4 border-t border-[#F4F4F5]">
          {isLoading ? (
            <div className="flex flex-wrap gap-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-24 rounded-full bg-[#F4F4F5]" />)}</div>
          ) : !tags?.length ? (
            <p className="text-[13px] text-[#A1A1AA]">No hashtags saved yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center gap-2 tag-pill">
                    <span>{tag.tag}</span>
                    <span className="text-[11px] font-semibold tabular" style={{ color: scoreColor(tag.overallScore ?? 0) }}>{tag.overallScore}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#A1A1AA]">
                {tags.length} tags · Avg score{' '}
                <span className="font-semibold" style={{ color: scoreColor(Math.round(tags.reduce((s, t) => s + (t.overallScore ?? 0), 0) / tags.length)) }}>
                  {Math.round(tags.reduce((s, t) => s + (t.overallScore ?? 0), 0) / tags.length)}
                </span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
    </TiltCard>
  );
}

export default function CollectionsPage() {
  const { data: collections, isLoading } = useQuery<Collection[]>({ queryKey: ['/api/collections'] });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>Collections</h1>
          <p className="text-[14px] text-[#71717A]">Saved hashtag sets organized by campaign.</p>
        </div>
        <CreateBar onCreated={() => {}} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl bg-[#F4F4F5]" />)}</div>
      ) : !collections?.length ? (
        <TiltCard intensity={5}><div className="bento-tile p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#F4F4F5] flex items-center justify-center mx-auto mb-3">
            <Bookmark size={20} className="text-[#A1A1AA]" />
          </div>
          <p className="text-[14px] font-medium text-[#111111] mb-1">No collections yet</p>
          <p className="text-[13px] text-[#71717A] mb-5 max-w-xs mx-auto">Save hashtag sets from your results for quick access.</p>
          <Link href="/generator"><a className="no-underline btn-primary inline-flex">Generate your first set</a></Link>
        </div></TiltCard>
      ) : (
        <div className="space-y-3">
          {collections.map(col => <CollectionCard key={col.id} collection={col} />)}
          <div className="pt-4 flex items-center justify-end">
            <Link href="/generator">
              <a className="no-underline text-[13px] text-[#71717A] hover:text-[#111111] flex items-center gap-1 transition-colors">
                Generate more <ArrowRight size={13} />
              </a>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
