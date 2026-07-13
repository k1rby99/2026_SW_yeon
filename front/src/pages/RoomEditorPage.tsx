import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Lock, Save, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useCreateRoom, useRoom, useUpdateRoom } from '../hooks/useRooms';
import { useUiStore } from '../store/uiStore';
import type { GoalAnalysis, RoomStatus, RoomType, RoomUpsertPayload } from '../types/domain';
import { useTranslation } from '../i18n';

const emptyForm: RoomUpsertPayload = {
  title: '', type: 'project', summary: '', tags: [], requiredRoles: [], capacity: 4,
  visibility: 'public', applicationMode: 'approval', meetingStyle: 'hybrid', location: '', notice: '',
};

const splitTags = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export function RoomEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const pushToast = useUiStore((state) => state.pushToast);
  const analysis = (location.state as { analysis?: GoalAnalysis } | null)?.analysis;
  const { data: room, isLoading } = useRoom(editing ? id : undefined);
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom(id);
  const [form, setForm] = useState<RoomUpsertPayload>(() => analysis ? {
    ...emptyForm,
    title: analysis.normalizedGoal,
    type: analysis.suggestedRoomType,
    tags: analysis.keywords,
    requiredRoles: analysis.suggestedRoles,
  } : emptyForm);
  const [tagsText, setTagsText] = useState(analysis?.keywords.join(', ') ?? '');
  const [rolesText, setRolesText] = useState(analysis?.suggestedRoles.join(', ') ?? '');
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('recruiting');

  useEffect(() => {
    if (!room) return;
    setForm({
      title: room.title, type: room.type, summary: room.summary, tags: room.tags,
      requiredRoles: room.requiredRoles, capacity: room.capacity, deadline: room.deadline,
      visibility: room.visibility ?? 'public', applicationMode: room.applicationMode ?? 'approval',
      meetingStyle: room.meetingStyle ?? 'hybrid', location: room.location ?? '', notice: room.notice ?? '',
    });
    setTagsText(room.tags.join(', '));
    setRolesText(room.requiredRoles.join(', '));
    setRoomStatus(room.status);
  }, [room]);

  if (editing && isLoading) return <LoadingSpinner />;
  if (editing && room?.membershipRole !== 'owner') return <div className="room-workspace-page"><p>{t.roomManagement.ownerOnly}</p></div>;

  const setField = <K extends keyof RoomUpsertPayload>(key: K, value: RoomUpsertPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { ...form, tags: splitTags(tagsText), requiredRoles: splitTags(rolesText) };
    try {
      const saved = editing ? await updateRoom.mutateAsync({ ...payload, status: roomStatus }) : await createRoom.mutateAsync(payload);
      pushToast(editing ? t.roomManagement.updated : t.roomManagement.created, 'success');
      navigate(`/rooms/${saved.id}`, { replace: true });
    } catch {
      pushToast(t.roomManagement.saveFailed, 'error');
    }
  };

  const pending = createRoom.isPending || updateRoom.isPending;
  return (
    <div className="room-workspace-page room-editor-page">
      <header className="room-workspace-header">
        <Link to={editing ? `/rooms/${id}` : '/goals'} aria-label={t.common.back}><ArrowLeft /></Link>
        <div><span>{editing ? t.roomManagement.settingsEyebrow : t.roomManagement.createEyebrow}</span><h1>{editing ? t.roomManagement.settingsTitle : t.roomManagement.createTitle}</h1></div>
      </header>

      {analysis && !editing && <div className="room-ai-prefill"><Sparkles /><p><strong>{t.roomManagement.aiPrefillTitle}</strong><span>{t.roomManagement.aiPrefillDescription}</span></p></div>}

      <form className="room-editor-form" onSubmit={submit}>
        <section className="room-editor-section">
          <h2>{t.roomManagement.basicInfo}</h2>
          <label><span>{t.roomManagement.titleLabel}</span><input required maxLength={60} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder={t.roomManagement.titlePlaceholder} /></label>
          <label><span>{t.roomManagement.typeLabel}</span><select value={form.type} onChange={(e) => setField('type', e.target.value as RoomType)}>{Object.entries(t.rooms.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>{t.roomManagement.summaryLabel}</span><textarea required maxLength={300} rows={4} value={form.summary} onChange={(e) => setField('summary', e.target.value)} placeholder={t.roomManagement.summaryPlaceholder} /></label>
          <label><span>{t.roomManagement.tagsLabel}</span><input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder={t.roomManagement.tagsPlaceholder} /></label>
          <label><span>{t.roomManagement.rolesLabel}</span><input value={rolesText} onChange={(e) => setRolesText(e.target.value)} placeholder={t.roomManagement.rolesPlaceholder} /></label>
        </section>

        <section className="room-editor-section">
          <h2>{t.roomManagement.operationInfo}</h2>
          <div className="room-form-row">
            <label><span>{t.roomManagement.capacityLabel}</span><input type="number" min={2} max={20} value={form.capacity} onChange={(e) => setField('capacity', Number(e.target.value))} /></label>
            <label><span>{t.roomManagement.deadlineLabel}</span><input type="date" value={form.deadline ?? ''} onChange={(e) => setField('deadline', e.target.value)} /></label>
          </div>
          <fieldset><legend>{t.roomManagement.meetingStyleLabel}</legend><div className="room-choice-group">{(['online', 'offline', 'hybrid'] as const).map((value) => <button key={value} type="button" className={form.meetingStyle === value ? 'is-selected' : ''} onClick={() => setField('meetingStyle', value)}>{form.meetingStyle === value && <Check />}{t.roomManagement.meetingStyles[value]}</button>)}</div></fieldset>
          <label><span>{t.roomManagement.locationLabel}</span><input value={form.location ?? ''} onChange={(e) => setField('location', e.target.value)} placeholder={t.roomManagement.locationPlaceholder} /></label>
          <label><span>{t.roomManagement.noticeLabel}</span><textarea rows={3} value={form.notice ?? ''} onChange={(e) => setField('notice', e.target.value)} placeholder={t.roomManagement.noticePlaceholder} /></label>
        </section>

        <section className="room-editor-section">
          <h2>{t.roomManagement.recruitingSettings}</h2>
          {editing && <fieldset><legend>{t.roomManagement.statusLabel}</legend><div className="room-choice-group">{(['recruiting', 'active', 'ended'] as const).map((value) => <button key={value} type="button" className={roomStatus === value ? 'is-selected' : ''} onClick={() => setRoomStatus(value)}>{roomStatus === value && <Check />}{t.rooms.status[value]}</button>)}</div></fieldset>}
          <fieldset><legend>{t.roomManagement.visibilityLabel}</legend><div className="room-choice-group">{(['public', 'private'] as const).map((value) => <button key={value} type="button" className={form.visibility === value ? 'is-selected' : ''} onClick={() => setField('visibility', value)}>{value === 'private' && <Lock />}{t.roomManagement.visibility[value]}</button>)}</div></fieldset>
          <fieldset><legend>{t.roomManagement.applicationModeLabel}</legend><div className="room-choice-group">{(['approval', 'instant'] as const).map((value) => <button key={value} type="button" className={form.applicationMode === value ? 'is-selected' : ''} onClick={() => setField('applicationMode', value)}>{form.applicationMode === value && <Check />}{t.roomManagement.applicationModes[value]}</button>)}</div></fieldset>
        </section>

        <button className="room-submit-button" type="submit" disabled={pending}><Save />{pending ? t.common.saving : editing ? t.roomManagement.saveSettings : t.roomManagement.createSubmit}</button>
      </form>
    </div>
  );
}
