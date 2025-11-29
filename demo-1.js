// 获取页面
const page = dv.current();
// clock数组，所有记录的时间项目放在一个数组中
var clocks = [
    { 
        name: "ob",
        totalminutes: 0,
    }, 
    {
        name: "bskr1",
        totalminutes:0,
    },
    {
        name: "ai",
        totalminutes:0,
    },
    {
        name: "linux",
        totalminutes:0,
    },
];
// 根据clock项目在页面的起止属性名，计算时间和的方法, 即更新clock项目的totalminutes
async function clockTime(clockIn, clockOut){
    // 检测参数是否满足条件
    if (!page[clockIn] || !page[clockOut]) return 0;
    // 获取clock-in和clock-out以/分割出来的数组
    const startTimeArr = page[clockIn].split('/');
    const endTimeArr = page[clockOut].split('/');
    
    // 循环每一个时间段并算出差值，最后算出所有差值的和
    let totalMs = 0;
    
    for(let i = 0; i < (startTimeArr.length > endTimeArr.length? endTimeArr.length: startTimeArr.length); i++){
        // let diffMs =  moment(endTimeArr[i], "HH:mm:ss") - moment(startTimeArr[i], "HH:mm:ss");
        const diffMs = moment(endTimeArr[i].trim(), "HH:mm:ss").diff(moment(startTimeArr[i].trim(), "HH:mm:ss"));
        if(!isNaN(diffMs)) totalMs += diffMs;
    }

    // 返回该clock项目的总时长
    let totalminutes = Math.floor(totalMs / (1000 * 60));

    return totalminutes;
    
}

// 核心方法： 读取页面，找到相关元素，修改页面内容，写入页面
// callback方法用于计算特定clock项目的时间和 
async function modifyPage(clocks, callback){
    // 获取文件
    const file = app.vault.getAbstractFileByPath(page.file.path);
    if(!file) return;
    // 读取当前文件内容
    let content = await app.vault.read(file);
// 修改文件内容
    for(let i = 0; i < clocks.length; i++){
    // 对文件中每一个clock项目对应的时间和的属性值改写为0
        // 循环到的clock项目
        let clock = clocks[i];
        // 该clock时间和的属性名
        let durationName = clock.name + "_totalDuration";
    // 向页面写入clock项目的初始值0
        // 使用正则表达式查找是否已存在 durationName 字段 ^test
        // 使用 RegExp 构造函数动态创建正则表达式，并转义特殊字符
        const escapedName = durationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const durationRegex = new RegExp(`^\s*${escapedName}::\s*.+$`,'m');
        // gpt-5 mini 建议的修改：const durationRegex = new RegExp('^\\s*' + escapedName + '::\\s*.+$','m');

        if (durationRegex.test(content)) {
            // 如果时间和的属性存在，则替换其值为0
            content = content.replace(durationRegex, `${durationName}:: 0`);
        } else {
            // 如果不存在，则在文件末尾添加该字段, 其值为0（初始值）
            content += `\n${durationName}:: 0`;
        }

        // 获取clock项目在页面的起始和终止的属性名
        let clockIn = clock.name + "_clock_in";
        let clockOut = clock.name + "_clock_out";

    // 在clock项目的起止时间都存在的条件下，向callback函数传入起止属性名，计算该clock项目的时间和
        if(page[clockIn] && page[clockOut]){
            // 等待callback函数返回数值
            clock.totalminutes = await callback(clockIn, clockOut);
    // 向页面中写入该clock项目的时间和，xx_duration: clock.stotalminutes
            if (durationRegex.test(content)){
                    // 如果存在，则替换其值
                    content = content.replace(durationRegex, `${durationName}:: ${clock.totalminutes}`);
                } else {
                    // 如果不存在，则在文件末尾添加该字段, 逻辑上不会执行到这里, 因为所有的时间和属性值都已经初始化
                    content += `\n${durationName}:: ${clock.totalminutes}`;
                }
    // 如果该clock项目的起止时间属性有问题，则把这个消息写入页面内容
        }else if(!page[clockIn] && !page[clockOut]){
            content += `\n缺少 ${clockIn} 数据 和 ${clockOut}数据`;
            content += `\n$page[${clockIn}]: ${page[clockIn]}, page[${clockOut}]: ${page[clockOut]}`;
        } else if(!page[clockOut]){
            content += `\n缺少 ${clockOut} 数据`;
        } else{
            content += `\n缺少 ${clockIn} 数据`;
        }

    }
// 将修改后的内容写回文件
    await app.vault.modify(file, content);

} 

// 运行流：
modifyPage(clocks, clockTime);