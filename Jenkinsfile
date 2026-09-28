// bgssai-health 部署流水线（Jenkins）。
//
// 部署通道唯一：本流水线是该产品的唯一部署入口，仅手动触发。
// 构建与 ship 的全部逻辑收敛在中央仓 bgssai-workflows 的 Jenkins 共享库（vars/ + resources/），
// 本文件只声明参数与阶段，避免多个产品仓各自维护一份实现而漂移。
//
// **目标环境由 Job 名前缀决定**（内部名 dev-health-deploy / prod-health-deploy，界面显示名
// bgssai-health deploy(dev) / bgssai-health deploy(prod)），
// 刻意不提供 environment 下拉框。详见共享库 bgssaiResolveEnvironment。
//
// 触发方式：仅手动，点 Build 即执行（无需填写任何确认串）。部署失败时不自动重试、不自动重新部署。
//
// **dev / prod 都走「目标机自建」**：控制器不构建 fat jar、也不推 jar，由目标机自己 git 拉最新
// 代码、就地构建、就地部署。走哪条由共享库 bgssaiDeployEnd 按环境判断。
// 产品源码按 Git Flow：现阶段 dev 与 prod 都拉 develop（只换 properties）。

@Library('bgssai') _

PRODUCT = [
  product: 'health',
  packageManager: 'npm',
  frontendScript: 'build:deploy',
  appPort: '8080',
  healthScheme: 'http',
]

pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timeout(time: 180, unit: 'MINUTES')
  }

  parameters {
    choice(name: 'target', choices: ['both', 'user', 'admin'], description: '部署目标（both=两端 / user=仅用户端 / admin=仅管理端），不改就是 both')
  }

  stages {
    stage('Resolve environment') {
      steps {
        script {
          env.BGSSAI_ENV = bgssaiResolveEnvironment(action: '部署', requireConfirm: false)
          if (env.BGSSAI_ENV != 'dev') { error 'HEALTH 当前仅分配 dev 主机；prod 发布需先配置独立凭据与主机。' }
        }
      }
    }

    stage('Build') {
      when { expression { !(env.BGSSAI_ENV in ['dev', 'prod']) } }
      steps {
        bgssaiBuildJars(PRODUCT)
      }
    }

    stage('Deploy user') {
      when { expression { params.target in ['both', 'user'] } }
      steps {
        bgssaiDeployEnd(PRODUCT + [end: 'user', environment: env.BGSSAI_ENV])
      }
    }

    stage('Deploy admin') {
      when { expression { params.target in ['both', 'admin'] } }
      steps {
        bgssaiDeployEnd(PRODUCT + [end: 'admin', environment: env.BGSSAI_ENV])
      }
    }
  }

  post {
    success {
      echo "部署成功: bgssai-health environment=${env.BGSSAI_ENV} target=${params.target}"
    }
    failure {
      echo "部署失败: bgssai-health environment=${env.BGSSAI_ENV} target=${params.target}"
      echo '按仓库约定：不自动重跑本流水线、不自动重新部署。请先定位原因，再由人工手动触发。'
      echo '目标机自建构建失败时远端未被改动；健康检查失败时 remote-deploy.sh 已自动回滚到上一个可用 jar，服务应仍在跑旧版本。'
    }
  }
}
