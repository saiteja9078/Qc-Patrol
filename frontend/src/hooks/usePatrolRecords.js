import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patrolApi } from '../api/patrolApi'
import toast from 'react-hot-toast'

export function usePatrolRecords({ date, page = 1, page_size = 20 } = {}) {
  return useQuery({
    queryKey: ['patrol-records', date, page, page_size],
    queryFn: () => patrolApi.listRecords({ date, page, page_size }).then((r) => r.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true, // re-sync when tab regains focus
  })
}

export function usePatrolRecord(id) {
  return useQuery({
    queryKey: ['patrol-record', id],
    queryFn: () => patrolApi.getRecord(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function usePatrolDates() {
  return useQuery({
    queryKey: ['patrol-dates'],
    queryFn: () => patrolApi.getDates().then((r) => r.data),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useCreateRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => patrolApi.createRecord(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrol-records'] })
      qc.invalidateQueries({ queryKey: ['patrol-dates'] })
    },
  })
}

export function useUpdateRecord(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => patrolApi.updateRecord(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrol-records'] })
      qc.invalidateQueries({ queryKey: ['patrol-record', id] })
    },
  })
}

export function useDeleteRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => patrolApi.deleteRecord(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrol-records'] })
      qc.invalidateQueries({ queryKey: ['patrol-dates'] })
      toast.success('記録を削除しました')
    },
  })
}
