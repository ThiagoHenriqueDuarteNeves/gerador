document.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer, shell } = require('electron');

    document.getElementById('gerarDados').addEventListener('click', () => {
        // Obter os valores dos inputs
        const numLinhasInput = document.getElementById('numLinhas');
        const numArquivosInput = document.getElementById('numArquivos');
        const nomeEventoInput = document.getElementById('nomeEvento');
        const numLinhas = parseInt(numLinhasInput.value);
        const numArquivos = parseInt(numArquivosInput.value);
        const nomeEvento = nomeEventoInput.value.trim();

        // Obter os campos selecionados
        const camposSelecionados = [];
        if (document.getElementById('nome').checked) camposSelecionados.push('Nome');
        if (document.getElementById('endereco').checked) camposSelecionados.push('Endereço');
        if (document.getElementById('telefone').checked) camposSelecionados.push('Telefone');
        if (document.getElementById('cpf').checked) camposSelecionados.push('CPF');
        if (document.getElementById('cnpj').checked) camposSelecionados.push('CNPJ');

        // Limpar mensagens anteriores e classes de erro
        limparMensagensDeErro();

        // Validação dos campos de entrada
        let valid = true;

        if (!numLinhas || numLinhas <= 0) {
            numLinhasInput.classList.add('input-error');
            valid = false;
        }

        if (!numArquivos || numArquivos <= 0) {
            numArquivosInput.classList.add('input-error');
            valid = false;
        }

        if (!nomeEvento) {
            nomeEventoInput.classList.add('input-error');
            valid = false;
        }

        if (camposSelecionados.length === 0) {
            alert('Selecione pelo menos um campo para gerar os dados.');
            valid = false;
        }

        if (!valid) {
            setTimeout(() => {
                // Remove o foco de qualquer input que esteja travado para garantir novas entradas
                document.activeElement.blur();
            }, 100);
            return;
        }

        // Atualiza o texto do progresso para informar o usuário que os dados estão sendo gerados
        var progressElement = document.getElementById('progress');
        progressElement.innerText = 'Gerando dados...';
        progressElement.style.display = 'block'; // Assegura que o elemento seja visível
        progressElement.className = 'progress'; // Reseta qualquer classe de sucesso/erro anterior

        // Enviar os dados para o processo principal do Electron para gerar os arquivos
        ipcRenderer.send('gerar-dados', { numLinhas, numArquivos, nomeEvento, camposSelecionados });
        console.log('Pedido de geração de dados enviado para o processo principal.');
    });

    // Receber o feedback do processo principal
    ipcRenderer.on('dados-gerados', (event, response) => {
        const { sucesso, mensagem, caminho } = response;

        // Atualiza o elemento HTML para mostrar a mensagem ao usuário
        var progressElement = document.getElementById('progress');
        progressElement.innerText = mensagem; // Exibe a mensagem recebida do processo principal
        progressElement.style.display = 'block'; // Garante que o elemento esteja visível

        // Define a cor de fundo do elemento dependendo do sucesso ou falha
        if (sucesso) {
            progressElement.classList.add('sucesso'); // Adiciona a classe de sucesso

            // Pergunta ao usuário se deseja abrir o local dos arquivos
            const abrirLocal = confirm('Deseja abrir o local dos arquivos gerados?');
            if (abrirLocal) {
                shell.openPath(caminho); // Abre a pasta no gerenciador de arquivos
            }
        } else {
            progressElement.classList.add('erro'); // Adiciona a classe de erro
        }

        console.log('Mensagem recebida do processo principal:', mensagem);
    });

    // Função para limpar mensagens de erro e classes de erro nos inputs
    function limparMensagensDeErro() {
        const numLinhasInput = document.getElementById('numLinhas');
        const numArquivosInput = document.getElementById('numArquivos');
        const nomeEventoInput = document.getElementById('nomeEvento');
        const progressElement = document.getElementById('progress');

        // Limpar classes de erro dos inputs
        numLinhasInput.classList.remove('input-error');
        numArquivosInput.classList.remove('input-error');
        nomeEventoInput.classList.remove('input-error');

        // Ocultar a mensagem de progresso e redefinir o estilo
        progressElement.style.display = 'none';
        progressElement.className = 'progress';
    }
});