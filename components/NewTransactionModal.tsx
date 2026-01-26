import React, { useState } from 'react';
import { Transaction } from '../types';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

interface NewTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    forcedType?: 'income' | 'expense';
}

export default function NewTransactionModal({ isOpen, onClose, forcedType }: NewTransactionModalProps) {
    const { addTransaction } = useApp();
    const { showToast } = useToast();

    const [type, setType] = useState<'income' | 'expense'>(forcedType || 'expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
    const [dueDate, setDueDate] = useState('');

    const categories = type === 'expense'
        ? ['Energia', 'Água', 'Internet', 'Aluguel', 'Lavanderia', 'Manutenção', 'Compra de Material', 'Marketing', 'Pro labore', 'Salários', 'Impostos', 'Costureira / Ajustes', 'Outros']
        : ['Venda Avulsa', 'Ajuste de Caixa', 'Outros'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !description || !category) {
            showToast('error', 'Preencha todos os campos obrigatórios.');
            return;
        }

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            type,
            amount: parseFloat(amount),
            description,
            category,
            date: new Date(date).toISOString(),
            status: type === 'income' ? 'pago' : status,
            dueDate: status === 'pendente' && dueDate ? new Date(dueDate).toISOString() : undefined
        };

        addTransaction(newTransaction);
        showToast('success', `${type === 'expense' ? (status === 'pendente' ? 'Conta a pagar' : 'Despesa') : 'Receita'} registrada com sucesso!`);

        // Reset form
        setAmount('');
        setDescription('');
        setCategory('');
        setDueDate('');
        setStatus('pago');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-black text-navy uppercase tracking-tight">
                        {forcedType === 'expense' ? 'Registrar Conta' : 'Novo Lançamento'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400 transition-all hover:shadow-sm">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Type Toggle */}
                    {!forcedType && (
                        <div className="flex bg-gray-100 p-1 rounded-2xl mb-2">
                            <button
                                type="button"
                                onClick={() => { setType('income'); setStatus('pago'); }}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-white text-green-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <span className="material-symbols-outlined text-lg">arrow_downward</span>
                                Entrada
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('expense')}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-white text-red-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <span className="material-symbols-outlined text-lg">arrow_upward</span>
                                Saída
                            </button>
                        </div>
                    )}

                    {type === 'expense' && (
                        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setStatus('pago')}
                                className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${status === 'pago' ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                            >
                                Pago Agora
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('pendente')}
                                className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${status === 'pendente' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                            >
                                Em Aberto
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Valor do Lançamento</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-lg">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-black text-2xl text-navy"
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Descrição</label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-bold text-navy"
                                placeholder="Do que se trata?"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none transition-all font-bold text-navy text-sm"
                                required
                            >
                                <option value="">Tipo...</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">
                                {status === 'pago' ? 'Data do Pgto' : 'Vencimento'}
                            </label>
                            <input
                                type="date"
                                value={status === 'pago' ? date : dueDate}
                                onChange={e => status === 'pago' ? setDate(e.target.value) : setDueDate(e.target.value)}
                                className={`w-full px-4 py-3.5 border rounded-2xl focus:ring-4 outline-none transition-all font-bold text-navy text-sm ${status === 'pendente' ? 'bg-orange-50/30 border-orange-100 focus:ring-orange-500/5 focus:border-orange-500/30' : 'bg-gray-50 border-gray-100 focus:ring-primary/5 focus:border-primary/30'}`}
                                required
                            />
                        </div>
                    </div>


                    <div className="pt-2">
                        <button
                            type="submit"
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${type === 'income' ? 'bg-green-600 shadow-green-600/20 hover:bg-green-700' : (status === 'pendente' ? 'bg-orange-500 shadow-orange-500/20 hover:bg-orange-600' : 'bg-red-600 shadow-red-600/20 hover:bg-red-700')}`}
                        >
                            <span className="material-symbols-outlined">check</span>
                            {status === 'pendente' ? 'Verificar e Agendar' : 'Confirmar Lançamento'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
