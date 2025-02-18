import { RULE_INPUT_BRIDGE_TYPE_PREFIX } from '@/common/constants'
import http from '@/common/http'
import { getBridgeKey } from '@/common/tools'
import {
  BridgeItem,
  BridgeMetricsData,
  ParamsForQueryRules,
  RuleItem,
  RuleMetrics,
} from '@/types/rule'
import { ListDataWithPagination } from '@/types/common'

//Bridges
export async function getBridgeList(): Promise<any> {
  try {
    const data = await http.get('/bridges')
    return Promise.resolve(
      data.map((item: Omit<BridgeItem, 'id' | 'idForRuleFrom'>) => {
        const id = getBridgeKey(item)
        return {
          id,
          idForRuleFrom: `${RULE_INPUT_BRIDGE_TYPE_PREFIX}${id}`,
          ...item,
        }
      }),
    )
  } catch (error) {
    return Promise.reject(error)
  }
}

export async function createBridge(body: Record<string, unknown>): Promise<BridgeItem> {
  try {
    const data = await http.post('/bridges', body)
    return Promise.resolve({ ...data, id: getBridgeKey(data) })
  } catch (error) {
    return Promise.reject(error)
  }
}

export async function updateBridge(id: string, body: BridgeItem): Promise<any> {
  if (!id) return Promise.reject()
  try {
    const data = await http.put('/bridges/' + encodeURIComponent(id), body)
    return Promise.resolve({ ...data, id: getBridgeKey(data) })
  } catch (error) {
    return Promise.reject(error)
  }
}

export function startStopBridge(id: string, op: 'enable' | 'disable'): Promise<any> {
  if (!id) return Promise.reject()
  const isEnable = op === 'enable'
  return http.put(`/bridges/${encodeURIComponent(id)}/enable/${isEnable}`)
}

export async function getBridgeInfo(id: string): Promise<any> {
  if (!id) return Promise.reject()
  try {
    const data = await http.get('/bridges/' + encodeURIComponent(id))
    return Promise.resolve({ ...data, id: getBridgeKey(data) })
  } catch (error) {
    return Promise.reject(error)
  }
}

export function deleteBridge(id: string, withDependency = false): Promise<any> {
  if (!id) return Promise.reject()
  return http.delete(
    `/bridges/${encodeURIComponent(id)}${withDependency ? '?also_delete_dep_actions' : ''}`,
    {
      errorsHandleCustom: [403],
    },
  )
}

export function reconnectBridgeForNode(node: string, bridgeID: string): Promise<number> {
  return http.post(`/nodes/${node}/bridges/${bridgeID}/restart`)
}

export async function resetBridgeMetrics(bridgeId: string): Promise<string> {
  return http.put(`/bridges/${bridgeId}/metrics/reset`)
}

export function testConnect(body: BridgeItem): Promise<void> {
  return http.post(`/bridges_probe`, body)
}

export function queryBridgeMetrics(id: string): Promise<BridgeMetricsData> {
  return http(`/bridges/${id}/metrics`)
}

//Rules
export function getRules(
  params: ParamsForQueryRules = { page: 1, limit: 1000 },
): Promise<ListDataWithPagination<RuleItem>> {
  return http.get('/rules', { params })
}

export function getRuleInfo(id: string): Promise<any> {
  if (!id) return Promise.reject()
  return http.get('/rules/' + encodeURIComponent(id))
}

export function createRules(body: Record<string, unknown>): Promise<any> {
  return http.post('/rules', body)
}

export function getRuleEvents(): Promise<any> {
  return http.get('/rule_events')
}

export function updateRules(id: string, body: Partial<RuleItem>): Promise<any> {
  if (!id) return Promise.reject()
  return http.put('/rules/' + encodeURIComponent(id), body)
}

export function deleteRules(id: string): Promise<any> {
  if (!id) return Promise.reject()
  return http.delete('/rules/' + encodeURIComponent(id))
}

export function testsql(body: Record<string, unknown>): Promise<any> {
  return http.post('/rule_test', body)
}

export function queryRuleMetrics(ruleId: string): Promise<RuleMetrics> {
  return http.get(`/rules/${ruleId}/metrics`)
}

export function resetRuleMetrics(ruleId: string): Promise<string> {
  return http.put(`/rules/${ruleId}/metrics/reset`)
}
