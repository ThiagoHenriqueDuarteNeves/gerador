const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Escuta o evento do renderer para gerar dados
ipcMain.on('gerar-dados', async (event, args) => {
    const { numLinhas, numArquivos, nomeEvento, camposSelecionados } = args;

    try {
        const sharedCpfSet = new Set();

        // Caminho da área de trabalho
        const desktopDir = path.join(os.homedir(), 'Desktop');
        const eventFolder = path.join(desktopDir, nomeEvento);

        // Cria a pasta do evento se não existir
        try {
            await fs.mkdir(eventFolder, { recursive: true });
        } catch (err) {
            console.error('Erro ao criar diretório:', err);
            event.sender.send('dados-gerados', { sucesso: false, mensagem: 'Erro ao criar diretório. Consulte o console para mais detalhes.' });
            return;
        }

        // Calcular número de linhas por arquivo
        var numLinhasPerArquivo = Math.floor(numLinhas / numArquivos);
        let linhasRestantes = numLinhas % numArquivos;

        // Gerar arquivos de dados de forma assíncrona
        for (let fileIdx = 1; fileIdx <= numArquivos; fileIdx++) {
            let linhasParaGerar = numLinhasPerArquivo;
            if (linhasRestantes > 0) {
                linhasParaGerar += 1;
                linhasRestantes -= 1;
            }

            var data = generateDataChunk(linhasParaGerar, sharedCpfSet, camposSelecionados);
            const csvContent = convertToCSV(data, camposSelecionados);
            await downloadCSV(csvContent, `${nomeEvento}_dados_saida_${fileIdx}.csv`, eventFolder);
        }

        // Envia uma mensagem de sucesso de volta para o renderer, incluindo o caminho da pasta
        console.log('Arquivos gerados com sucesso, enviando mensagem para o renderer...');
        event.sender.send('dados-gerados', { sucesso: true, mensagem: 'Dados gerados com sucesso!', caminho: eventFolder });

    } catch (err) {
        console.error('Erro ao gerar os dados:', err);
        event.sender.send('dados-gerados', { sucesso: false, mensagem: 'Erro ao gerar os dados. Consulte o console para mais detalhes.' });
    }
});

// Função para gerar um pedaço dos dados com base nos campos selecionados
function generateDataChunk(numLinhas, sharedCpfSet, camposSelecionados) {
    const data = [];
    for (let i = 0; i < numLinhas; i++) {
        const row = {};

        if (camposSelecionados.includes('Nome')) {
            row['Nome'] = generateName();
        }
        if (camposSelecionados.includes('Endereço')) {
            row['Endereço'] = generateAddress();
        }
        if (camposSelecionados.includes('Telefone')) {
            row['Telefone'] = generatePhone();
        }
        if (camposSelecionados.includes('CPF')) {
            row['CPF'] = generateUniqueCPF(sharedCpfSet);
        }
        if (camposSelecionados.includes('CNPJ')) {
            row['CNPJ'] = generateCNPJ();
        }

        data.push(row);
    }
    return data;
}

function generateName() {
    const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'José', 'Paula'];
    const lastNames = ['Silva', 'Souza', 'Costa', 'Oliveira', 'Pereira', 'Rodrigues'];
    return `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
}

function generateAddress() {
    const streets = ['Rua das Flores', 'Avenida Paulista', 'Praça da Sé', 'Alameda Santos'];
    const numbers = getRandomInt(1, 1000);
    const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba'];
    return `${randomChoice(streets)}, ${numbers}, ${randomChoice(cities)}`;
}

function generatePhone() {
    return `(${getRandomInt(10, 99)}) ${getRandomInt(90000, 99999)}-${getRandomInt(1000, 9999)}`;
}

function generateUniqueCPF(sharedCpfSet) {
    let cpfNumber;
    do {
        cpfNumber = generateCPF();
    } while (sharedCpfSet.has(cpfNumber));
    sharedCpfSet.add(cpfNumber);
    return cpfNumber;
}

function generateCPF() {
    let cpf = [];
    for (let i = 0; i < 9; i++) {
        cpf.push(getRandomInt(0, 9));
    }
    for (let j = 0; j < 2; j++) {
        let val = cpf.reduce((sum, num, idx) => sum + num * (cpf.length + 1 - idx), 0) % 11;
        cpf.push(val > 1 ? 11 - val : 0);
    }
    return cpf.join('');
}

function generateCNPJ() {
    let cnpj = [];
    for (let i = 0; i < 12; i++) {
        cnpj.push(getRandomInt(0, 9));
    }
    for (let j = 0; j < 2; j++) {
        let val = cnpj.reduce((sum, num, idx) => sum + num * (cnpj.length + 1 - idx), 0) % 11;
        cnpj.push(val > 1 ? 11 - val : 0);
    }
    return `${cnpj.slice(0, 2).join('')}.${cnpj.slice(2, 5).join('')}.${cnpj.slice(5, 8).join('')}/${cnpj.slice(8, 12).join('')}-${cnpj.slice(12).join('')}`;
}

async function downloadCSV(csvContent, filename, eventFolder) {
    const filePath = path.join(eventFolder, filename);
    try {
        await fs.writeFile(filePath, csvContent, 'utf8');
        console.log(`Arquivo ${filename} salvo com sucesso.`);
    } catch (err) {
        console.error(`Erro ao salvar o arquivo ${filename}:`, err);
        throw err; // Propaga o erro para ser tratado pelo try-catch no `ipcMain.on`
    }
}

function convertToCSV(data, camposSelecionados) {
    const separator = ';';
    const header = camposSelecionados.join(separator);
    const csvRows = data.map(row => {
        return camposSelecionados.map(field => row[field] || '').join(separator);
    });
    return [header, ...csvRows].join('\n');
}

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
