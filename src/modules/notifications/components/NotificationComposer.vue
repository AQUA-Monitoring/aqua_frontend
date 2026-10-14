<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { toast } from 'vue3-toastify'
import { useTerritoryCatalog } from '@/modules/addressing'
import { notificationsApi } from '../api'
import TerritoryAudiencePicker from './TerritoryAudiencePicker.vue'

const emit = defineEmits<{ published: [] }>()
const territory = useTerritoryCatalog()
void territory.load()
const form = reactive({
  title: '',
  message: '',
  severity: 'ATTENTION',
  is_global: false,
  region_ids: [] as string[],
  neighborhood_ids: [] as string[],
})
const heading = ref<HTMLElement | null>(null)
const busy = ref(false)
const error = ref('')
const draftId = ref<string | null>(null)
const preview = ref<{ users: number; devices: number } | null>(null)
const canReview = computed(
  () =>
    form.title.trim() &&
    form.message.trim() &&
    (form.is_global || form.region_ids.length || form.neighborhood_ids.length),
)
const severityLabel = computed(
  () =>
    ({ INFO: 'Informativo', ATTENTION: 'Atenção', CRITICAL: 'Crítico' })[
      form.severity as 'INFO' | 'ATTENTION' | 'CRITICAL'
    ],
)
function updateSelection(selection: { regionIds: string[]; neighborhoodIds: string[] }) {
  form.region_ids = selection.regionIds
  form.neighborhood_ids = selection.neighborhoodIds
}
async function review() {
  if (busy.value || !canReview.value) return
  busy.value = true
  error.value = ''
  try {
    if (!draftId.value) {
      const event = await notificationsApi.createManualEvent({
        ...form,
        title: form.title.trim(),
        message: form.message.trim(),
        region_ids: form.is_global ? [] : [...form.region_ids],
        neighborhood_ids: form.is_global ? [] : [...form.neighborhood_ids],
      })
      draftId.value = event.id
    }
    preview.value = await notificationsApi.previewEvent(draftId.value)
    await nextTick()
    heading.value?.focus()
  } catch {
    error.value =
      'Não foi possível consultar o alcance. Tente novamente. Nenhum envio foi solicitado.'
  } finally {
    busy.value = false
  }
}
async function edit() {
  if (!draftId.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await notificationsApi.cancelEvent(draftId.value)
    draftId.value = null
    preview.value = null
    await nextTick()
    heading.value?.focus()
  } catch {
    error.value = 'Não foi possível voltar à edição. Tente novamente.'
  } finally {
    busy.value = false
  }
}
async function publish() {
  if (!draftId.value || !preview.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await notificationsApi.publishEvent(draftId.value)
    toast.success('Comunicado publicado. As entregas serão processadas em seguida.')
    draftId.value = null
    preview.value = null
    Object.assign(form, {
      title: '',
      message: '',
      severity: 'ATTENTION',
      is_global: false,
      region_ids: [],
      neighborhood_ids: [],
    })
    emit('published')
  } catch {
    error.value =
      'Não foi possível confirmar a publicação. Tente novamente; a mesma publicação não será duplicada.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="composer">
    <header class="composer-heading">
      <div>
        <p class="eyebrow">NOVO COMUNICADO</p>
        <h2 ref="heading" tabindex="-1">
          {{ draftId ? 'Confira antes de publicar' : 'O que você quer comunicar?' }}
        </h2>
        <p>
          {{
            draftId
              ? 'Revise a mensagem e o público que receberá este aviso.'
              : 'Escreva o aviso, escolha o público e confira o alcance antes do envio.'
          }}
        </p>
      </div>
      <span class="step-label">{{ draftId ? 'Revisão' : 'Mensagem e público' }}</span>
    </header>
    <form v-if="!draftId" @submit.prevent="review">
      <fieldset :disabled="busy" class="composer-fields">
        <section class="compose-card" aria-labelledby="message-heading">
          <h3 id="message-heading"><span class="step-number">1</span> Escreva a mensagem</h3>
          <label class="field"
            >Título<input
              v-model="form.title"
              maxlength="160"
              required
              placeholder="Ex.: Atenção às chuvas na região Norte"
          /></label>
          <label class="field"
            >Mensagem<textarea
              aria-label="Mensagem"
              v-model="form.message"
              maxlength="1000"
              required
              rows="4"
              placeholder="Explique o que está acontecendo e o que as pessoas devem fazer."
            /><span class="field-note"
              >Seja claro e objetivo. <span>{{ form.message.length }}/1000</span></span
            ></label
          >
          <label class="field severity-field"
            >Nível do aviso<select v-model="form.severity">
              <option value="INFO">Informativo</option>
              <option value="ATTENTION">Atenção</option>
              <option value="CRITICAL">Crítico</option>
            </select></label
          >
        </section>
        <section class="compose-card" aria-labelledby="audience-heading">
          <h3 id="audience-heading">
            <span class="step-number">2</span> Escolha quem deve receber
          </h3>
          <div class="audience-modes">
            <label :class="{ chosen: !form.is_global }"
              ><input
                v-model="form.is_global"
                type="radio"
                :value="false"
                name="notification-audience"
              /><span
                ><strong>Selecionar no mapa</strong
                ><small>Escolha regiões e bairros, pelo mapa ou pela lista.</small></span
              ></label
            ><label :class="{ chosen: form.is_global }"
              ><input
                v-model="form.is_global"
                type="radio"
                :value="true"
                name="notification-audience"
              /><span
                ><strong>Todos os usuários</strong
                ><small>Inclui usuários que não acompanham nenhum território.</small></span
              ></label
            >
          </div>
          <div v-if="form.is_global" class="global-note">
            <span class="material-symbols-outlined" aria-hidden="true">public</span>
            <p>
              Este comunicado será global. O push será enviado aos dispositivos com notificações
              ativas.
            </p>
          </div>
          <template v-else
            ><p v-if="territory.loading.value" class="form-note" role="status">
              Carregando regiões e bairros…
            </p>
            <div v-else-if="territory.error.value" class="form-error" role="alert">
              {{ territory.error.value }}
              <button type="button" class="text-action" @click="territory.load">
                Tentar novamente
              </button>
            </div>
            <TerritoryAudiencePicker
              v-else
              :regions="territory.regions.value"
              :neighborhoods="territory.neighborhoods.value"
              :region-ids="form.region_ids"
              :neighborhood-ids="form.neighborhood_ids"
              @change="updateSelection"
          /></template>
        </section>
      </fieldset>
      <div class="compose-footer">
        <p>Nenhuma notificação será enviada nesta etapa.</p>
        <button class="primary-button" :disabled="busy || !canReview">
          {{ busy ? 'Consultando alcance…' : 'Revisar mensagem e alcance' }}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
    <section v-else class="compose-card review-card" aria-label="Revisão da publicação">
      <div class="review-preview">
        <span class="severity-badge">{{ severityLabel }}</span>
        <h3>{{ form.title }}</h3>
        <p class="message-preview">{{ form.message }}</p>
      </div>
      <h3>Público selecionado</h3>
      <p class="form-note">
        {{
          form.is_global
            ? 'Todos os usuários ativos'
            : `${form.region_ids.length} regiões e ${form.neighborhood_ids.length} bairros`
        }}
      </p>
      <p v-if="!form.is_global" class="form-note">
        {{
          [
            ...territory.regions.value
              .filter((item) => form.region_ids.includes(item.id))
              .map((item) => item.name),
            ...territory.neighborhoods.value
              .filter((item) => form.neighborhood_ids.includes(item.id))
              .map((item) => item.name),
          ].join(' · ')
        }}
      </p>
      <div v-if="preview" class="audience-metrics" aria-live="polite">
        <div>
          <strong>{{ preview.users }}</strong
          ><span>usuários no público</span>
        </div>
        <div>
          <strong>{{ preview.devices }}</strong
          ><span>dispositivos com push ativo</span>
        </div>
      </div>
      <p v-if="preview && !preview.devices" class="zero-audience" role="status">
        Nenhum dispositivo deste público está inscrito. Você pode publicar o comunicado, mas não
        haverá entrega de push agora.
      </p>
      <p class="form-note">
        Uma pessoa em mais de um território é contada uma única vez. O alcance pode mudar se
        usuários atualizarem suas preferências.
      </p>
      <div class="review-actions">
        <button type="button" class="secondary-button" :disabled="busy" @click="edit">
          Voltar e editar</button
        ><button
          v-if="!preview"
          type="button"
          class="primary-button"
          :disabled="busy"
          @click="review"
        >
          {{ busy ? 'Consultando…' : 'Consultar alcance novamente' }}</button
        ><button v-else type="button" class="primary-button" :disabled="busy" @click="publish">
          {{ busy ? 'Publicando…' : 'Confirmar publicação' }}
        </button>
      </div>
    </section>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.composer {
  color: #19304b;
}
.composer-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0 24px;
}
h2 {
  font-size: clamp(1.3rem, 2.4vw, 1.7rem);
  font-weight: 700;
}
.composer-heading p:last-child {
  font-size: 14px;
  color: #52627a;
  margin-top: 6px;
}
.eyebrow {
  color: #2768ca;
  font-size: 11px;
  letter-spacing: 0.12em;
  font-weight: 700;
  margin-bottom: 8px;
}
.step-label {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 99px;
  color: #52627a;
  background: #edf2f8;
  font-size: 12px;
}
.composer-fields {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.compose-card {
  min-width: 0;
  border: 1px solid #dce4ed;
  padding: 24px;
  border-radius: 18px;
  background: #fff;
}
h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 650;
  margin-bottom: 20px;
}
.step-number {
  display: inline-grid;
  place-items: center;
  height: 28px;
  width: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 13px;
  background: #eaf2ff;
  color: #245fbb;
}
.field {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  font-size: 13px;
  font-weight: 600;
}
input:not([type='radio']),
textarea,
select {
  min-width: 0;
  width: 100%;
  min-height: 46px;
  border: 1px solid #b9c8d9;
  border-radius: 10px;
  padding: 12px;
  font-size: 16px;
  font-weight: 400;
  background: transparent;
}
textarea {
  resize: vertical;
}
.severity-field {
  max-width: 320px;
}
.field-note {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 400;
  color: #52627a;
}
.audience-modes {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}
.audience-modes label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #d1dce8;
  border-radius: 12px;
  cursor: pointer;
}
.audience-modes label.chosen {
  border-color: #2768ca;
  background: #f0f6ff;
  box-shadow: inset 0 0 0 1px #2768ca;
}
.audience-modes input {
  accent-color: #2768ca;
  margin-top: 3px;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.audience-modes strong {
  display: block;
  font-size: 14px;
}
.audience-modes small {
  display: block;
  color: #52627a;
  line-height: 1.6;
  margin-top: 4px;
}
.global-note {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-radius: 12px;
  background: #f0f6ff;
  font-size: 14px;
  line-height: 1.6;
}
.compose-footer,
.review-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
}
.compose-footer p {
  font-size: 13px;
  color: #52627a;
}
.primary-button,
.secondary-button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 11px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}
.primary-button {
  color: white;
  background: #245fbb;
}
.secondary-button {
  color: #245fbb;
  border: 1px solid #b9c8d9;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 3px solid #75a7f3;
  outline-offset: 3px;
}
.review-preview {
  background: #f5f8fc;
  border: 1px solid #dce4ed;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
}
.review-preview h3 {
  margin: 12px 0 8px;
  overflow-wrap: anywhere;
}
.message-preview {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.7;
}
.severity-badge {
  font-size: 12px;
  color: #245fbb;
  font-weight: 600;
}
.form-note {
  font-size: 13px;
  line-height: 1.7;
  color: #52627a;
  overflow-wrap: anywhere;
}
.audience-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}
.audience-metrics > div {
  border: 1px solid #dce4ed;
  border-radius: 12px;
  padding: 16px;
  display: grid;
}
.audience-metrics strong {
  font-size: 28px;
  color: #245fbb;
}
.audience-metrics span {
  font-size: 12px;
  color: #52627a;
}
.zero-audience,
.form-error {
  padding: 16px;
  border-radius: 12px;
  background: #fff4dc;
  color: #7c4d0c;
  margin: 16px 0;
  font-size: 14px;
  line-height: 1.6;
}
.text-action {
  text-decoration: underline;
  padding: 10px;
}
@media (min-width: 640px) {
  .audience-modes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .compose-card {
    padding: 16px;
  }
  .compose-footer button,
  .review-actions button {
    width: 100%;
  }
}
:global(.dark) .composer {
  color: #eef4ff;
}
:global(.dark) .compose-card {
  background: #102b47;
  border-color: #314760;
}
:global(.dark) .composer-heading p:last-child,
:global(.dark) .form-note,
:global(.dark) .field-note,
:global(.dark) .audience-modes small,
:global(.dark) .compose-footer p,
:global(.dark) .audience-metrics span {
  color: #b3c3d7;
}
:global(.dark) .audience-modes label.chosen,
:global(.dark) .global-note,
:global(.dark) .review-preview {
  background: #183a5c;
  border-color: #3d699c;
}
:global(.dark) .secondary-button,
:global(.dark) .severity-badge,
:global(.dark) .audience-metrics strong {
  color: #a9ceff;
}
</style>
