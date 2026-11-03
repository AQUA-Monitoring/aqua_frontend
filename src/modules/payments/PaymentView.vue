<script setup lang="ts">
import { formatLocale } from '@/app/i18n'
import { ref, onMounted, reactive } from 'vue'
import { loadMercadoPago } from '@mercadopago/sdk-js'
import { BaseForm, StepByStep } from '@/shared'
import PaymentQrCode from './PaymentQrCode.vue'
import { usePaymentStore } from './paymentStore'
import type { IFormField } from '@/shared'

const selected = ref<number | null>(null)
const paymentForm = ref<{
  submitForm: () => Record<string, string | number | null | undefined>
} | null>(null)
const paymentStore = usePaymentStore()

const dateNow = new Date()
const dateFormat = new Intl.DateTimeFormat(formatLocale()).format(dateNow)

onMounted(async () => {
  await loadMercadoPago()
})

const payForms = [
  { icon: '/icons/payment/card.svg', name: 'Cartão' },
  { icon: '/icons/payment/pix.svg', name: 'Pix' },
]

const donationData = reactive({
  payment_method_id: '',
  first_name: '',
  last_name: '',
  description: '',
  payer: {
    email: '',
    identification: {
      type: '',
      number: '',
    },
  },
  transaction_amount: 0,
})

const pixUrl = ref('')
const qrBase64 = ref('')
const qrCode = ref('')

const paymentFields: IFormField[] = [
  {
    id: 'form-checkout__payerFirstName',
    label: 'Nome do titular',
    fields: [
      {
        id: 'form-checkout__payerFirstName',
        name: 'payerFirstName',
        placeholder: 'Digite o nome do titular aqui',
        type: 'text',
        autocomplete: 'name',
      },
    ],
  },
  {
    id: 'form-checkout__payerLastName',
    label: 'Sobrenome',
    fields: [
      {
        id: 'form-checkout__payerLastName',
        name: 'payerLastName',
        placeholder: 'Digite o sobrenome do titular aqui',
        type: 'text',
        autocomplete: 'last_name',
      },
    ],
  },
  {
    id: 'form-checkout__email',
    label: 'Email',
    fields: [
      {
        id: 'form-checkout__email',
        name: 'email',
        placeholder: 'Digite seu email aqui',
        type: 'email',
        autocomplete: 'email',
      },
    ],
  },
  {
    id: 'form-checkout__identificationType',
    label: 'Tipo de documento',
    fields: [
      {
        id: 'form-checkout__identificationType',
        name: 'identificationType',
        placeholder: 'Informe o tipo de documento',
        type: 'text',
        autocomplete: 'cpf',
      },
    ],
  },
  {
    id: 'form-checkout__identificationNumber',
    label: 'Número do documento',
    fields: [
      {
        id: 'form-checkout__identificationNumber',
        name: 'identificationNumber',
        placeholder: 'xxx.xxx.xxx.xx',
        type: 'number',
        autocomplete: 'document',
      },
    ],
  },
  {
    id: 'transactionAmount',
    label: 'Valor',
    fields: [
      {
        id: 'transactionAmount',
        name: 'transactionAmount',
        placeholder: 'R$ x.xxx, xx',
        type: 'number',
        autocomplete: 'document',
      },
    ],
  },
]

const handleStepAction = async (step: number) => {
  if (step === 2) {
    const values = paymentForm.value?.submitForm()
    if (values) {
      savePaymentFields(values)
    }
    return true
  }

  if (step === 3) {
    return await handlePayment()
  }

  return true
}

async function handlePayment() {
  try {
    const response = await paymentStore.createPixPayment({
      payment_method_id: 'pix',
      first_name: donationData.first_name,
      last_name: donationData.last_name,
      description: donationData.description,
      payer: {
        email: donationData.payer.email,
        identification: {
          type: donationData.payer.identification.type,
          number: donationData.payer.identification.number,
        },
      },
      transaction_amount: donationData.transaction_amount,
    })

    qrCode.value = response.point_of_interaction.transaction_data.qr_code
    qrBase64.value = response.point_of_interaction?.transaction_data?.qr_code_base64
    pixUrl.value = response?.point_of_interaction?.transaction_data?.ticket_url

    return true
  } catch (error) {
    console.error('Erro ao criar pagamento Pix:', error)
    alert('Ocorreu um erro ao processar o pagamento. Tente novamente.')
    return false
  }
}

function savePaymentFields(values: Record<string, string | number | null | undefined>) {
  donationData.payment_method_id = 'pix'
  donationData.first_name = String(values['form-checkout__payerFirstName'] ?? '')
  donationData.last_name = String(values['form-checkout__payerLastName'] ?? '')
  donationData.description = 'Doação referente ao AQUA'
  donationData.payer.email = String(values['form-checkout__email'] ?? '')
  donationData.payer.identification.type = String(values['form-checkout__identificationType'] ?? '')
  donationData.payer.identification.number = String(
    values['form-checkout__identificationNumber'] ?? '',
  )
  donationData.transaction_amount = Number(values['transactionAmount'] ?? 0)
}

const showQrCode = ref(true)
const closePopup = () => {
  qrCode.value = ''
  qrBase64.value = ''
  pixUrl.value = ''
  showQrCode.value = false
}
</script>

<template>
  <section class="p-10">
    <StepByStep
      :total-steps="4"
      finish-button-text="Finalizar"
      :on-next="handleStepAction"
      :button-labels="{ 2: 'Confirmar', 3: 'Pagar' }"
    >
      <template #step-1>
        <h1 class="mb-20 text-center text-2xl font-semibold">Forma de pagamento</h1>

        <div class="grid justify-center">
          <div class="mb-10 grid w-83 gap-5 md:flex md:justify-center md:gap-10">
            <label v-for="(form, index) in payForms" :key="index" class="cursor-pointer">
              <input
                type="radio"
                name="method"
                :value="index"
                v-model="selected"
                class="peer hidden"
              />
              <div
                class="md:py-auto flex justify-center items-center gap-5 rounded-2xl border-2 border-transparent p-3 py-5 text-center shadow-lg transition peer-checked:border-blue-600 md:grid md:h-40 md:w-40 md:gap-0 md:px-0 md:shadow-xl dark:bg-[#00182F]"
              >
                <img :src="form.icon" :alt="form.name" class="md:mx-auto md:my-auto" />
                <p>{{ form.name }}</p>
              </div>
            </label>
          </div>
        </div>
      </template>

      <template #step-2>
        <h1 class="mb-20 text-center text-2xl font-semibold">Pagamento com pix</h1>

        <BaseForm ref="paymentForm" :form-fields="paymentFields" @submit="savePaymentFields" />
      </template>

      <template #step-3>
        <h1 class="mb-10 text-center text-2xl font-semibold">Dados da compra</h1>

        <ul class="lg:w-125 grid gap-2">
          <li class="flex justify-between font-semibold">
            <p>Nome do titular:</p>
            <span class="text-[#999999]">{{ donationData.first_name }}</span>
          </li>
          <li class="flex justify-between font-semibold">
            <p>Email:</p>
            <span class="text-[#999999]">{{ donationData.payer.email }}</span>
          </li>
          <li class="flex justify-between font-semibold">
            <p>CPF do rirular:</p>
            <span class="text-[#999999]">{{ donationData.payer.identification.number }}</span>
          </li>
          <li class="flex justify-between font-semibold">
            <p>Data de pagamento:</p>
            <span class="text-[#999999]">{{ dateFormat }}</span>
          </li>
          <li class="flex justify-between font-semibold">
            <p>Forma de pagamento:</p>
            <span class="text-[#999999]">{{ donationData.payment_method_id }}</span>
          </li>
        </ul>

        <div
          class="flex justify-between items-center shadow-[0_8px_25px_rgba(0,0,0,0.40)] rounded-full px-5 my-10"
        >
          <div class="flex items-center">
            <img src="/icons/payment/donation.svg" alt="Doação" />
            <p class="font-bold">Doação</p>
          </div>

          <input
            type="number"
            :placeholder="`R$ ${donationData.transaction_amount}`"
            class="border border-[#7AA6C8] outline-none rounded-2xl px-3 py-1 w-30"
          />
        </div>
      </template>

      <template #step-4>
        <PaymentQrCode
          v-if="showQrCode"
          :qrcode="`data:image/jpeg;base64,${qrBase64}`"
          :code="qrCode"
          :url="pixUrl"
          @close="closePopup"
        />
      </template>
    </StepByStep>
  </section>
</template>
