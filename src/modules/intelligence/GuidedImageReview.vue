<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import api from '@/app/plugins/axios'

type Label = { id: string; classification: string; reason: string; created_at: string }
type Evidence = {
  id: string
  classification: string
  prediction: Record<string, number>
  captured_at: string
  label: Label | null
}
const props = defineProps<{ item: Evidence; preview?: string; cameraName: string; busy: boolean }>()
const emit = defineEmits<{ saved: [label: Label]; saving: [value: boolean] }>()
const options = [
  {
    value: 'NO_INDICATION',
    title: 'Sem indício',
    criterion: 'Sem evidência visível de acúmulo de água.',
    reasons: ['Não há acúmulo de água visível'],
  },
  {
    value: 'INTERMEDIATE_INDICATION',
    title: 'Intermediário — acúmulo localizado',
    criterion: 'Água acumulada visível, com extensão limitada.',
    reasons: ['Acúmulo de água em uma área limitada'],
  },
  {
    value: 'FLOOD_INDICATION',
    title: 'Alagamento',
    criterion: 'Evidência clara de área normalmente seca tomada por água.',
    reasons: ['Área normalmente seca visivelmente tomada por água'],
  },
  {
    value: 'UNUSABLE',
    title: 'Imagem inadequada',
    criterion: 'Iluminação, obstrução ou qualidade impedem a inspeção.',
    reasons: ['Iluminação insuficiente', 'Visão obstruída', 'Imagem sem nitidez ou com falha'],
  },
  {
    value: 'INDETERMINATE',
    title: 'Não consigo determinar',
    criterion: 'Imagem inspecionável, mas evidência insuficiente para escolher uma categoria.',
    reasons: [
      'Não é possível distinguir água de reflexo ou sombra',
      'A cena não oferece evidência suficiente',
    ],
  },
]
const decision = ref(props.item.label?.classification || '')
const selectedReasons = ref<string[]>([])
const extra = ref(props.item.label?.reason || '')
const error = ref('')
const conflict = ref(false)
const failedImage = ref(false)
const editing = ref(!props.item.label)
const dialog = ref<HTMLDialogElement>()
const comparison = ref<HTMLElement>()
const request = ref<{ fingerprint: string; id: string }>()
const chosen = computed(() => options.find((option) => option.value === decision.value))
const justification = computed(() =>
  [...selectedReasons.value, extra.value.trim()].filter(Boolean).join('. '),
)
const title = (value: string) => options.find((option) => option.value === value)?.title || value
const percent = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
function choose(value: string) {
  decision.value = value
  selectedReasons.value = []
}
async function save() {
  if (
    props.busy ||
    conflict.value ||
    !decision.value ||
    !justification.value ||
    justification.value.length > 2000 ||
    !props.preview ||
    failedImage.value
  )
    return
  const payload = {
    previous_id: props.item.label?.id || null,
    classification: decision.value,
    reason: justification.value,
  }
  const fingerprint = JSON.stringify(payload)
  if (request.value?.fingerprint !== fingerprint)
    request.value = { fingerprint, id: crypto.randomUUID() }
  emit('saving', true)
  error.value = ''
  try {
    const { data } = await api.post<{ id: string; classification: string }>(
      `/flood_monitoring/intelligence/selections/${props.item.id}/labels/`,
      { ...payload, request_id: request.value!.id },
    )
    emit('saved', {
      id: data.id,
      classification: data.classification,
      reason: payload.reason,
      created_at: new Date().toISOString(),
    })
    editing.value = false
    await nextTick()
    comparison.value?.focus()
  } catch (err) {
    const response = (
      err as { response?: { status?: number; data?: { detail?: string | string[] } } }
    ).response
    const detail = response?.data?.detail
    error.value = Array.isArray(detail)
      ? detail.join(' ')
      : detail || 'Não foi possível salvar. Sua escolha foi preservada. Tente novamente.'
    conflict.value =
      response?.status === 409 || /outra revisão|atualize antes de corrigir/i.test(error.value)
    if (conflict.value)
      error.value =
        'Esta imagem recebeu outra revisão. Use Atualizar para carregar a decisão mais recente antes de corrigir.'
  } finally {
    emit('saving', false)
  }
}
</script>

<template>
  <div class="guided-review">
    <p>{{ cameraName }} · {{ new Date(item.captured_at).toLocaleString('pt-BR') }}</p>
    <button
      v-if="preview && !failedImage"
      type="button"
      class="image-button"
      aria-label="Ampliar imagem da câmera"
      @click="dialog?.showModal()"
    >
      <img :src="preview" :alt="`Evidência de ${cameraName}`" @error="failedImage = true" />
      <span>Ampliar imagem</span>
    </button>
    <p v-else role="status">Imagem indisponível. Use Atualizar para tentar carregá-la novamente.</p>
    <dialog
      ref="dialog"
      aria-label="Imagem ampliada"
      @click="$event.target === dialog && dialog?.close()"
    >
      <button type="button" autofocus @click="dialog?.close()">Fechar ampliação</button>
      <img v-if="preview" :src="preview" :alt="`Evidência ampliada de ${cameraName}`" />
    </dialog>
    <p>Classifique apenas o que está visível. Não infira profundidade nem segurança de passagem.</p>
    <form v-if="editing" @submit.prevent="save">
      <fieldset :disabled="busy || conflict">
        <legend>Como você classifica esta imagem?</legend>
        <label
          v-for="option in options"
          :key="option.value"
          class="choice"
          :class="{ selected: decision === option.value }"
        >
          <input
            type="radio"
            :name="`classification-${item.id}`"
            :value="option.value"
            :checked="decision === option.value"
            required
            @change="choose(option.value)"
          />
          <span
            ><strong>{{ option.title }}</strong
            ><span class="criterion">{{ option.criterion }}</span></span
          >
        </label>
      </fieldset>
      <fieldset v-if="chosen" :disabled="busy || conflict">
        <legend>O que você observou?</legend>
        <label v-for="reason in chosen.reasons" :key="reason" class="reason"
          ><input v-model="selectedReasons" type="checkbox" :value="reason" />{{ reason }}</label
        >
      </fieldset>
      <label class="extra"
        >{{ item.label ? 'Justificativa da correção' : 'Observação complementar (opcional)' }}
        <textarea
          v-model="extra"
          rows="3"
          maxlength="2000"
          :disabled="busy || conflict"
          placeholder="Descreva o que é visível na imagem"
        />
      </label>
      <p>
        Selecione um motivo ou escreva uma observação. {{ justification.length }}/2000 caracteres.
      </p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button
        :disabled="
          busy ||
          conflict ||
          !decision ||
          !justification ||
          justification.length > 2000 ||
          !preview ||
          failedImage
        "
      >
        {{ busy ? 'Salvando…' : item.label ? 'Registrar correção' : 'Salvar revisão' }}
      </button>
      <button v-if="item.label" type="button" :disabled="busy" @click="editing = false">
        Cancelar correção
      </button>
    </form>
    <div v-if="item.label" ref="comparison" class="comparison" role="status" tabindex="-1">
      <h3>
        {{
          item.label.classification === item.classification
            ? '✓ Concordância com o modelo'
            : '≠ Divergência do modelo'
        }}
      </h3>
      <p><strong>Sua classificação:</strong> {{ title(item.label.classification) }}</p>
      <p><strong>Previsão do modelo:</strong> {{ title(item.classification) }}</p>
      <p v-for="(value, key) in item.prediction" :key="key">
        {{ { normal: 'Sem indício', medium: 'Intermediário', flooded: 'Alagamento' }[key] || key }}:
        {{ percent(value) }}
      </p>
      <p>Justificativa registrada: {{ item.label.reason }}</p>
      <p>
        Revisada em {{ new Date(item.label.created_at).toLocaleString('pt-BR') }}. Correções
        preservam as decisões anteriores.
      </p>
      <p>Concordância nesta fila não mede a acurácia geral do modelo.</p>
      <button v-if="!editing" type="button" :disabled="busy" @click="editing = true">
        Corrigir revisão
      </button>
    </div>
  </div>
</template>

<style scoped>
.guided-review {
  min-width: 0;
}
p {
  margin: 0.8rem 0;
}
button {
  padding: 0.7rem 1rem;
  border: 1px solid #6886a0;
  border-radius: 0.6rem;
  cursor: pointer;
  margin: 0.3rem;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.image-button {
  display: block;
  width: 100%;
  margin: 0;
  background: #101e2b;
  color: white;
}
img {
  display: block;
  width: 100%;
  max-height: 65vh;
  object-fit: contain;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 1rem 0;
  min-width: 0;
}
legend {
  font-weight: 700;
  margin-bottom: 0.6rem;
}
.choice {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  border: 1px solid #a6bfd3;
  border-radius: 0.6rem;
  padding: 0.8rem;
  margin: 0.5rem 0;
  cursor: pointer;
}
.selected {
  border: 2px solid #0453af;
}
.criterion {
  display: block;
  margin-top: 0.25rem;
}
input {
  flex: 0 0 auto;
  width: 1.2rem;
  height: 1.2rem;
  margin-top: 0.2rem;
}
.reason {
  display: flex;
  gap: 0.6rem;
  align-items: start;
  margin: 0.7rem 0;
}
.extra {
  display: grid;
  gap: 0.5rem;
}
textarea {
  width: 100%;
  padding: 0.7rem;
  border: 1px solid #6886a0;
  border-radius: 0.5rem;
  background: white;
  color: #153b59;
}
.comparison {
  border: 1px solid #6886a0;
  border-radius: 0.6rem;
  padding: 1rem;
  margin-top: 1rem;
}
dialog {
  margin: auto;
  width: min(96vw, 1400px);
  max-height: 95dvh;
  padding: 1rem;
  border-radius: 0.8rem;
  background: #101e2b;
  color: white;
}
dialog::backdrop {
  background: #000b;
}
dialog img {
  max-height: 80dvh;
}
:focus-visible {
  outline: 3px solid #3294ef;
  outline-offset: 3px;
}
[role='alert'] {
  color: #ae3030;
}
</style>
