## 如何调试mysql2源码？？
  创建development 目录

  引入 ../index.js 文件这是mysql2向外暴露模块的文件

  运行脚本开始调试源码
## 创建链接调试
  1 通过createConnection函数创建连接，传入数据库的基本参数和网络端口号
  
  > createConnection 函数在../index.js中被声明
  
  >>该函数通过 new ConnectionConfig（./lib/connection_config.js） 创建 连接的配置项
  >>```
  >> 如果输入的option是字符串URL，则将其解析为对象
  >> 如果输入的就是对象，则不处理
  >> 最终获得连接的配置参数，这些参数中包含的默认连接配置已经混入
  >>```
  >>
  
  2
## mysql连接使用分为几步？
mysql 的使用分为两部操作，分别是
* 认证阶段
* 命令执行阶段
 