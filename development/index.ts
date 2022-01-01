import { createConnection } from '../index'

const connect = createConnection({
  user: 'root',
  password: '123456',
  database: 'mysql',
  debug: true,
})
connect.query("select * from user",(e,r)=>{
    if (e) {
      console.log(e);
    }
    console.log("结果为");
    
    // console.log(r);
})