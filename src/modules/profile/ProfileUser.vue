<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/modules/auth'

defineProps<{ compact?: boolean }>()

const authStore = useAuthStore()
const maxProfilePictureBytes = 10 * 1024 * 1024

const profileImage = computed<string | null>(() => {
  const picture = authStore.user?.profile_picture
  if (!picture) return null
  if (picture.startsWith('http')) return picture
  const apiBase = String(import.meta.env.VITE_BASE_URL || '/api/').replace(/\/api\/?$/, '')
  return `${apiBase}${picture}`
})

const previewImage = ref<string | null>(null)
const imageFailed = ref(false)
const uploadingImage = ref(false)
const uploadError = ref<string | null>(null)
const avatarSource = computed(() =>
  imageFailed.value
    ? '/profile/default-user.svg'
    : previewImage.value || profileImage.value || '/profile/default-user.svg',
)

watch([profileImage, previewImage], () => {
  imageFailed.value = false
})

function clearPreview() {
  if (previewImage.value?.startsWith('blob:')) URL.revokeObjectURL(previewImage.value)
  previewImage.value = null
}

onMounted(async () => {
  if (!authStore.user) {
    try {
      await authStore.getMe()
    } catch {
      authStore.logout({ silent: true })
    }
  }
})

onUnmounted(clearPreview)

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || !target.files[0]) return
  const file = target.files[0]

  uploadError.value = null
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > maxProfilePictureBytes) {
    uploadError.value = 'Envie uma imagem JPEG ou PNG de até 10 MB.'
    target.value = ''
    return
  }

  clearPreview()
  const nextPreview = URL.createObjectURL(file)
  previewImage.value = nextPreview
  uploadingImage.value = true
  try {
    await authStore.updateMe({ profile_picture: file })
  } catch {
    clearPreview()
    uploadError.value = 'Não foi possível atualizar a foto.'
  } finally {
    uploadingImage.value = false
    target.value = ''
  }
}

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <section class="profile-card" :class="{ 'compact-profile': compact }" aria-label="Seu perfil">
    <div class="profile-identity">
      <div class="profile-photo">
        <button
          type="button"
          class="avatar-button"
          :disabled="uploadingImage"
          :aria-label="uploadingImage ? 'Enviando foto de perfil' : 'Alterar foto de perfil'"
          :aria-busy="uploadingImage"
          @click="openFilePicker"
        >
          <img :src="avatarSource" alt="" class="profile-avatar" @error="imageFailed = true" />
          <span class="avatar-badge material-symbols-outlined" aria-hidden="true"
            >photo_camera</span
          >
        </button>
        <span class="photo-hint" aria-live="polite">{{
          uploadingImage ? 'Enviando…' : 'Alterar foto'
        }}</span>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png"
          class="hidden"
          aria-label="Selecionar foto de perfil"
          @change="handleFileChange"
        />
      </div>
      <div class="profile-heading">
        <p class="profile-eyebrow">MINHA CONTA</p>
        <h2>{{ authStore.user?.name || 'Usuário' }}</h2>
      </div>
    </div>

    <p v-if="uploadError" class="profile-error" role="alert">{{ uploadError }}</p>

    <dl class="profile-details">
      <div>
        <dt>E-mail</dt>
        <dd>{{ authStore.user?.email || 'Não informado' }}</dd>
      </div>
    </dl>

    <div class="profile-actions">
      <RouterLink to="/seguranca" class="profile-action edit-action">
        <span class="material-symbols-outlined" aria-hidden="true">edit</span>
        Editar informações
      </RouterLink>
      <button type="button" class="profile-action logout-action" @click="handleLogout">
        <span class="material-symbols-outlined" aria-hidden="true">logout</span>
        Sair da conta
      </button>
    </div>
  </section>
</template>

<style scoped>
.profile-card {
  --profile-border: #dbe3ed;
  --profile-muted: #52627a;
  box-sizing: border-box;
  align-self: start;
  width: 100%;
  min-width: 0;
  height: auto;
  margin-top: 20px;
  padding: 24px;
  border: 1px solid var(--profile-border);
  border-radius: 20px;
  background: #fff;
  color: #172b46;
}
.profile-identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
}
.profile-photo {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.avatar-button {
  position: relative;
  display: block;
  width: 88px;
  height: 88px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--profile-border);
  background: #edf4ff;
  cursor: pointer;
}
.profile-avatar {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.avatar-badge {
  position: absolute;
  right: -3px;
  bottom: -1px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #245fbb;
  color: #fff;
  font-size: 15px;
}
.avatar-button:hover .profile-avatar {
  filter: brightness(0.94);
}
.avatar-button:disabled {
  cursor: wait;
  opacity: 0.65;
}
.photo-hint {
  color: var(--profile-muted);
  font-size: 12px;
}
.profile-heading {
  width: 100%;
  min-width: 0;
}
.profile-eyebrow {
  margin: 0 0 7px;
  color: #245fbb;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.profile-heading h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.profile-details {
  margin: 22px 0 0;
  padding: 16px 0;
  border-top: 1px solid var(--profile-border);
  border-bottom: 1px solid var(--profile-border);
  text-align: left;
}
.profile-details dt {
  margin-bottom: 5px;
  color: var(--profile-muted);
  font-size: 12px;
  font-weight: 500;
}
.profile-details dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.profile-actions {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}
.profile-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}
.profile-action .material-symbols-outlined {
  flex-shrink: 0;
  font-size: 18px;
}
.edit-action {
  background: #245fbb;
  color: #fff;
}
.edit-action:hover {
  background: #1c4e9c;
}
.logout-action {
  border-color: #e5c9cd;
  background: transparent;
  color: #a13240;
}
.logout-action:hover {
  background: #fff1f2;
}
.avatar-button:focus-visible,
.profile-action:focus-visible {
  outline: 3px solid #75a7f3;
  outline-offset: 3px;
}
.profile-error {
  margin-top: 16px;
  color: #b42336;
  font-size: 13px;
  line-height: 1.5;
}
@media (min-width: 1024px) {
  .profile-card {
    flex: 0 0 280px;
    margin-right: 24px;
  }
  .compact-profile {
    flex-basis: 260px;
    margin-right: 0;
  }
}
@media (max-width: 639px) {
  .profile-card {
    padding: 20px;
  }
  .profile-identity {
    flex-direction: row;
    gap: 16px;
    text-align: left;
  }
  .avatar-button {
    width: 72px;
    height: 72px;
  }
  .profile-heading h2 {
    font-size: 18px;
  }
}
@media (min-width: 420px) and (max-width: 1023px) {
  .profile-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.dark .profile-card {
  --profile-border: #314760;
  --profile-muted: #b3c3d7;
  background: #102b47;
  color: #eef4ff;
}
.dark .avatar-button {
  border-color: #102b47;
}
.dark .avatar-badge {
  border-color: #102b47;
}
.dark .profile-eyebrow {
  color: #9dc5ff;
}
.dark .logout-action {
  color: #ffadb6;
  border-color: #7a4654;
}
.dark .logout-action:hover {
  background: #472b3d;
}
.dark .profile-error {
  color: #ffadb6;
}
</style>
