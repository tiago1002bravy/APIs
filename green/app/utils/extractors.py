"""
Utilitários para extração de dados do payload.
"""
from typing import Any, Dict, List, Optional

def safe_get(data: Dict[str, Any], keys: List[str], default: Optional[Any] = None) -> Optional[Any]:
    """
    Obtém um valor de um dicionário aninhado de forma segura.
    
    Args:
        data: Dicionário de dados
        keys: Lista de chaves para navegar no dicionário
        default: Valor padrão caso não encontre o caminho
        
    Returns:
        O valor encontrado ou o valor padrão
    """
    temp = data
    for key in keys:
        if isinstance(temp, dict):
            temp = temp.get(key)
        else:
            return default
        if temp is None:
            return default
    return temp

def extract_field(data: Dict[str, Any], possible_paths: List[List[str]]) -> Optional[Any]:
    """
    Extrai um campo do payload tentando diferentes caminhos possíveis.
    
    Args:
        data: Dicionário de dados
        possible_paths: Lista de caminhos possíveis para encontrar o valor
        
    Returns:
        O primeiro valor não nulo encontrado ou None
    """
    for path in possible_paths:
        value = safe_get(data, path)
        if value is not None:
            return value
    return None 