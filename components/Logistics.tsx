import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { Item, ItemStatus, Contract } from '../types';

export default function Logistics() {
    const { items, updateItem, contracts, updateContractStatus, navigateTo, setSelectedContractId } = useApp();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'triagem' | 'lavanderia' | 'atelier'>('triagem');
    const [searchTerm, setSearchTerm] = useState('');

    // Helper: Dates
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

    // --- LOGIC: Daily Flow ---

    // 1. Pickups Today (Saídas)
    // Contracts starting TODAY that are 'Ativo' or 'Agendado'
    const todayPickups = useMemo(() => {
        return contracts.filter(c =>
            (c.contractType === 'Venda' ? c.eventDate.split('T')[0] === today : c.startDate.split('T')[0] === today) &&
            (c.status === 'Agendado' || c.status === 'Ativo')
        ).flatMap(c => {
            return c.items.map(itemId => {
                const item = items.find(i => i.id === itemId);
                return { item, contract: c };
            }).filter(x => x.item); // Filter out undefined if item moved/deleted
        });
    }, [contracts, items, today]);

    // 2. Returns Today (Retornos)
    // Contracts ending TODAY that are 'Ativo'
    // 2. Returns Today (Retornos)
    // Contracts ending TODAY or BEFORE (Late) that are 'Ativo'
    const todayReturns = useMemo(() => {
        return contracts.filter(c =>
            c.contractType !== 'Venda' &&
            c.endDate.split('T')[0] <= today && // Catches overdue returns too
            c.status === 'Ativo'
        ).flatMap(c => {
            return c.items.map(itemId => {
                const item = items.find(i => i.id === itemId);
                return { item, contract: c };
            }).filter(x => x.item);
        });
    }, [contracts, items, today]);


    // --- LOGIC: Backstage Processing ---

    // Items in specific operational statuses
    const processingItems = useMemo(() => {
        return items.filter(i => {
            const matchesSearch =
                i.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (activeTab === 'triagem') return i.status === 'Devolução';
            if (activeTab === 'lavanderia') return i.status === 'Na Lavanderia';
            if (activeTab === 'atelier') return i.status === 'No Atelier';
            return false;
        });
    }, [items, searchTerm, activeTab]);


    // --- HANDLERS ---

    const handleConfirmPickup = (itemId: string, itemName: string, contractId: string) => {
        // Validation: Signature check (Digital OR Physical)
        const contract = contracts.find(c => c.id === contractId);
        if (contract && !contract.lesseeSignature && !contract.isPhysicallySigned) {
            showToast('error', 'Saída Bloqueada: Contrato sem assinatura!');
            return;
        }

        // 1. Update Item Status
        updateItem(itemId, { status: 'Alugado', statusColor: 'red' });
        showToast('success', `${itemName} confirmado para saída!`);

        // 2. Check Smart Start (Auto-Start Contract)
        if (contract) {
            // Check if ALL OTHER items are already 'Alugado'
            const allOthersPickedUp = contract.items
                .filter(id => id !== itemId) // Exclude current (we know it's being picked up)
                .every(id => {
                    const i = items.find(x => x.id === id);
                    return i?.status === 'Alugado';
                });

            if (allOthersPickedUp) {
                updateContractStatus(contractId, 'Ativo');
                showToast('info', `Contrato #${contractId} iniciado automaticamente!`);
            }
        }
    };

    const handleReceiveItem = (itemId: string, itemName: string, contractId: string) => {
        // 1. Update Item Status
        updateItem(itemId, { status: 'Devolução', statusColor: 'orange' });
        showToast('info', `${itemName} recebido.Enviado para Triagem.`);

        // 2. Check Smart Finish (Auto-Finalize Contract)
        const contract = contracts.find(c => c.id === contractId);
        if (contract) {
            // Check if ALL OTHER items are already in 'Devolução' (or passed stages)
            const allOthersReturned = contract.items
                .filter(id => id !== itemId)
                .every(id => {
                    const i = items.find(x => x.id === id);
                    // Consider returned if status is Devolução, Lavanderia, Atelier, etc.
                    return ['Devolução', 'Na Lavanderia', 'No Atelier', 'Disponível'].includes(i?.status || '');
                });

            if (allOthersReturned) {
                updateContractStatus(contractId, 'Finalizado');
                showToast('success', `Contrato #${contractId} finalizado automaticamente!`);
            }
        }
    };

    const handleMoveTo = (itemId: string, status: ItemStatus, color: string, locationName: string) => {
        updateItem(itemId, { status: status, statusColor: color });
        showToast('success', `Item movido para ${locationName} `);
    };

    const handleRestock = (itemId: string) => {
        updateItem(itemId, { status: 'Disponível', statusColor: 'primary' });
        showToast('success', 'Item pronto! Devolvido ao estoque.');
    };


    // --- RENDER HELPERS ---

    const renderCard = (
        data: { item: Item | undefined, contract: Contract },
        action: 'pickup' | 'return'
    ) => {
        const { item, contract } = data;
        if (!item) return null;

        const isDone = action === 'pickup'
            ? item.status === 'Alugado'
            : ['Devolução', 'Na Lavanderia', 'No Atelier', 'Disponível'].includes(item.status);

        const needsSignature = action === 'pickup' && !contract.lesseeSignature && !contract.isPhysicallySigned;

        return (
            <div key={`${contract.id}-${item.id}`} className={`bg-white p-3 md:p-4 rounded-2xl border ${isDone ? 'border-green-100 bg-green-50/30' : (needsSignature ? 'border-amber-200 bg-amber-50/20 shadow-inner' : 'border-gray-100')} shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 group transition-all`}>
                <div className="flex gap-3 md:gap-4 items-center w-full sm:w-auto">
                    <div className="size-14 md:size-16 rounded-xl bg-cover bg-center border border-gray-100 shadow-sm shrink-0" style={{ backgroundImage: `url('${item.img}')` }}></div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{contract.eventType}</span>
                        </div>
                        <p className="font-black text-navy leading-tight truncate">{item.name}</p>
                        <button
                            onClick={() => {
                                setSelectedContractId(contract.id);
                                navigateTo('contracts');
                            }}
                            className="text-[10px] md:text-xs text-primary hover:text-blue-700 mt-1 font-bold flex items-center gap-1 group/link"
                        >
                            Contrato #{contract.id.split('-').length > 2 ? contract.id.split('-')[2] : contract.id.slice(-6)}
                            <span className="material-symbols-outlined text-[12px] opacity-0 group-hover/link:opacity-100 transition-opacity">open_in_new</span>
                        </button>
                    </div>
                </div>

                {isDone ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl w-full sm:w-auto justify-center">
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Concluído</span>
                    </div>
                ) : needsSignature ? (
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl w-full justify-center">
                            <span className="material-symbols-outlined text-lg animate-pulse">edit_note</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">Pendente de Assinatura</span>
                        </div>
                        <p className="text-[10px] text-amber-500 font-bold text-center italic">Não é possível liberar</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                        {action === 'pickup' && contract.isPhysicallySigned && !item.status.includes('Alugado') && (
                            <div className="flex items-center gap-1.5 justify-center text-[9px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 py-1 rounded-lg border border-emerald-100 mb-1">
                                <span className="material-symbols-outlined text-sm">inventory_2</span>
                                Assinado no Papel
                            </div>
                        )}
                        <button
                            onClick={() => action === 'pickup' ? handleConfirmPickup(item.id, item.name, contract.id) : handleReceiveItem(item.id, item.name, contract.id)}
                            className={`
                                px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto active:scale-95
                                ${action === 'pickup'
                                    ? 'bg-navy text-white shadow-navy/20 hover:bg-primary'
                                    : 'bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-600'
                                }
                            `}
                        >
                            <span className="material-symbols-outlined text-lg">
                                {action === 'pickup' ? 'outbox' : 'input'}
                            </span>
                            {action === 'pickup' ? 'Liberar Saída' : 'Receber'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header / Command Center */}
            <header className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="flex flex-col gap-4 md:gap-6">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-navy tracking-tight flex items-center gap-2 md:gap-3">
                            <span className="material-symbols-outlined text-2xl md:text-3xl text-primary">hub</span>
                            Centro de Operações
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-1">Gestão de fluxo diário e processamento de itens.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center justify-center p-3 md:p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                            <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-400 tracking-[0.15em] mb-1">Saídas</span>
                            <span className="text-xl md:text-3xl font-black text-navy">{todayPickups.length}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 md:p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                            <span className="text-[9px] md:text-[10px] font-black uppercase text-orange-400 tracking-[0.15em] mb-1">Retornos</span>
                            <span className="text-xl md:text-3xl font-black text-navy">{todayReturns.length}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 md:p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                            <span className="text-[9px] md:text-[10px] font-black uppercase text-purple-400 tracking-[0.15em] mb-1">Processo</span>
                            <span className="text-xl md:text-3xl font-black text-navy">
                                {items.filter(i => ['Devolução', 'Na Lavanderia', 'No Atelier'].includes(i.status)).length}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Split */}
            <div className="flex-1 flex flex-col lg:overflow-hidden lg:flex-row">

                {/* Daily Flow Section */}
                <div className="flex flex-col bg-white/50 border-b lg:border-b-0 lg:border-r border-gray-200">
                    <div className="p-4 md:p-6 lg:overflow-y-auto custom-scrollbar space-y-6 md:space-y-8">

                        {/* SAÍDAS */}
                        <section>
                            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                <span className="material-symbols-outlined text-2xl md:text-3xl text-blue-600">flight_takeoff</span>
                                <h2 className="text-base md:text-lg font-black text-navy uppercase tracking-tight">Próximas Retiradas</h2>
                            </div>

                            <div className="flex flex-col gap-2 md:gap-3">
                                {todayPickups.length > 0 ? (
                                    todayPickups.map(data => renderCard(data, 'pickup'))
                                ) : (
                                    <div className="p-4 md:p-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                        <span className="material-symbols-outlined text-2xl md:text-3xl mb-1">check_circle</span>
                                        <p className="text-xs md:text-sm font-medium">Nenhuma saída pendente hoje.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="w-full h-px bg-gray-100"></div>

                        {/* RETORNOS */}
                        <section>
                            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                <span className="material-symbols-outlined text-2xl md:text-3xl text-orange-600">flight_land</span>
                                <h2 className="text-base md:text-lg font-black text-navy uppercase tracking-tight">Retornos Esperados</h2>
                            </div>

                            <div className="flex flex-col gap-2 md:gap-3">
                                {todayReturns.length > 0 ? (
                                    todayReturns.map(data => renderCard(data, 'return'))
                                ) : (
                                    <div className="p-4 md:p-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                                        <span className="material-symbols-outlined text-2xl md:text-3xl mb-1">event_available</span>
                                        <p className="text-xs md:text-sm font-medium">Nenhum retorno agendado hoje.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Processing Hub Section */}
                <div className="flex-1 flex flex-col bg-gray-50">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 bg-white px-4 md:px-6 pt-2 md:pt-4 overflow-x-auto no-scrollbar gap-2">
                        {[
                            { id: 'triagem', label: 'Triagem', icon: 'inbox', color: 'orange' },
                            { id: 'lavanderia', label: 'Lavanderia', icon: 'local_laundry_service', color: 'cyan' },
                            { id: 'atelier', label: 'Manutenção', icon: 'content_cut', color: 'purple' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-2 px-4 md:px-6 py-3 border-b-2 font-black text-[10px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap rounded-t-xl
                                    ${activeTab === tab.id
                                        ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50/10`
                                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                                <span>{tab.label}</span>
                                <span className={`ml-1 px-2 py-0.5 rounded-lg text-[10px] ${activeTab === tab.id ? `bg-${tab.color}-100 text-${tab.color}-700` : 'bg-gray-100 text-gray-500'} font-black`}>
                                    {items.filter(i => {
                                        if (tab.id === 'triagem') return i.status === 'Devolução';
                                        if (tab.id === 'lavanderia') return i.status === 'Na Lavanderia';
                                        if (tab.id === 'atelier') return i.status === 'No Atelier';
                                        return false;
                                    }).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div className="p-3 md:p-4 flex gap-3 bg-white border-b border-gray-100">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-2 md:top-2.5 text-gray-400 text-lg md:text-xl">search</span>
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-9 md:pl-10 pr-4 py-1.5 md:py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none text-xs md:text-sm"
                            />
                        </div>
                    </div>

                    {/* Process List */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-3">
                            {processingItems.map(item => (
                                <div key={item.id} className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group">
                                    <div className="flex gap-4 items-center">
                                        <div className="size-16 md:size-20 rounded-2xl bg-cover bg-center border border-gray-100 shrink-0 shadow-sm" style={{ backgroundImage: `url('${item.img}')` }}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100">
                                                    #{item.id.slice(-4)}
                                                </span>
                                            </div>
                                            <p className="font-black text-navy text-base md:text-lg truncate">{item.name}</p>
                                            <p className="text-[10px] md:text-xs text-gray-400 mt-1 flex items-center gap-1 font-bold">
                                                <span className="material-symbols-outlined text-base">location_on</span>
                                                {item.status}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Buttons based on Tab */}
                                    <div className="flex flex-wrap gap-2 w-full">
                                        {activeTab === 'triagem' && (
                                            <>
                                                <button
                                                    onClick={() => handleMoveTo(item.id, 'Na Lavanderia', 'cyan', 'Lavanderia')}
                                                    className="flex-1 min-w-[100px] px-3 py-3 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-cyan-100 active:scale-95"
                                                    title="Enviar para Lavanderia"
                                                >
                                                    <span className="material-symbols-outlined text-lg">local_laundry_service</span>
                                                    <span>Lavar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleMoveTo(item.id, 'No Atelier', 'purple', 'Atelier')}
                                                    className="flex-1 min-w-[100px] px-3 py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-purple-100 active:scale-95"
                                                    title="Enviar para Manutenção"
                                                >
                                                    <span className="material-symbols-outlined text-lg">content_cut</span>
                                                    <span>Reparar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleRestock(item.id)}
                                                    className="flex-1 min-w-[100px] px-3 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-emerald-100 active:scale-95"
                                                    title="Devolver ao Estoque"
                                                >
                                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                                    <span>Liberar</span>
                                                </button>
                                            </>
                                        )}

                                        {activeTab === 'lavanderia' && (
                                            <button
                                                onClick={() => handleRestock(item.id)}
                                                className="w-full px-4 py-3.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-lg">dry_cleaning</span>
                                                Pronto / Limpo
                                            </button>
                                        )}

                                        {activeTab === 'atelier' && (
                                            <button
                                                onClick={() => handleRestock(item.id)}
                                                className="w-full px-4 py-3.5 bg-purple-500 text-white hover:bg-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                                Pronto / Reparado
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {processingItems.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
                                    <p className="text-sm font-medium">Tudo limpo por aqui!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}