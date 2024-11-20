import * as k8s from '@kubernetes/client-node'

class K8sHandler {
  private readonly k8sApi: k8s.AppsV1Api

  constructor() {
    const kc = new k8s.KubeConfig()
    kc.loadFromFile('k8s/config.yml')
    this.k8sApi = kc.makeApiClient(k8s.AppsV1Api)
  }

  async scaleDeployment(namespace: string, deploymentName: string, replicas: number) {
    try {
      const deployment = await this.k8sApi.readNamespacedDeployment(deploymentName, namespace)

      if (deployment.body.spec) {
        deployment.body.spec.replicas = replicas
      } else {
        throw new Error('Deployment spec not found.')
      }

      await this.k8sApi.replaceNamespacedDeployment(deploymentName, namespace, deployment.body)
      console.log(`Scaled ${deploymentName} to ${replicas} replicas.`)
    } catch (err) {
      console.error('Error scaling deployment:', err)
    }
  }

  async readNumDeploymentReplicas(namespace: string, deploymentName: string) {
    try {
      const deployment = await this.k8sApi.readNamespacedDeployment(deploymentName, namespace)
      const numReplicas = deployment.body.status?.replicas
      console.log(`Deployment ${deploymentName} found in namespace ${namespace} has ${numReplicas} replicas.`)
      return numReplicas
    } catch (err) {
      console.error('Error reading deployment:', err)
    }
  }
}

export default new K8sHandler()
