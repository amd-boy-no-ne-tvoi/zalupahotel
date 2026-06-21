import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import styles from './Owner.module.css'
import pets from './OwnerPetsPage.module.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const SPECIES_ICON: Record<string, string> = {
  кот: '🐱', кошка: '🐱', cat: '🐱',
  собака: '🐶', dog: '🐶', пёс: '🐶',
}

function petIcon(species: string) {
  return SPECIES_ICON[species.toLowerCase()] ?? '🐾'
}

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  notes?: string
  photoUrl?: string
}

export default function OwnerPetsPage() {
  const [list, setList] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    api.get('/pets/my')
      .then(({ data }) => setList(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>{t('common.loading')}</div>

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('owner.pets.title')}</h1>
          <p className={styles.subtitle}>{list.length} питомц{list.length === 1 ? 'ец' : list.length < 5 ? 'ца' : 'ев'}</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className={`${styles.empty} glass`}>
          <span>🐾</span>
          <p>{t('owner.pets.empty')}</p>
        </div>
      ) : (
        <div className={pets.grid} data-tour="owner-pets-grid">
          {list.map((pet) => {
            const photo = pet.photoUrl
              ? (pet.photoUrl.startsWith('http') ? pet.photoUrl : `${API_BASE}${pet.photoUrl}`)
              : null

            return (
              <div key={pet.id} className={`${pets.card} glass`}>
                <div className={pets.photoWrap}>
                  {photo
                    ? <img src={photo} alt={pet.name} className={pets.photo} />
                    : <span className={pets.photoPlaceholder}>{petIcon(pet.species)}</span>
                  }
                </div>
                <div className={pets.info}>
                  <div className={pets.name}>{pet.name}</div>
                  <div className={pets.meta}>
                    {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                  </div>
                  {pet.notes && <div className={pets.notes}>{pet.notes}</div>}
                </div>
                <button
                  className={pets.reportsBtn}
                  onClick={() => navigate(`/owner/reports?petId=${pet.id}`)}
                >
                  {t('owner.pets.reportsLink')}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
